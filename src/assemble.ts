// Session builder. Enforces the assembly rules in brief.md §5:
//
//   1. Pick 12-14 items.
//   2. Never two consecutive items from the same standard.
//   3. Tier 1 appears in EVERY session regardless of plan.
//   4. Include >= 2 items she missed in a prior session (spaced recall).
//   5. Randomize order after selection. Do not sort by difficulty.
//
// Rule 3 is taken literally: `--tier 2` still yields a tier-1 item, because
// signed arithmetic and multiplication are the root causes and the brief says
// they appear regardless of what else the session is for.
//
// Rule 4 is honest about its limit. The log records the problem as text, not
// the seed that produced it, so an exact past item cannot be reconstructed.
// What the assembler guarantees is >= 2 items drawn from the STANDARDS she
// missed. Logging the item seed printed on the key would let a later build
// reproduce the exact problem.

import type { Generator, Item, Session, Standard, Tier } from "./generate.ts";
import { RNG, generateItems, shuffle } from "./generate.ts";
import { BUILT, REGISTRY } from "./registry.ts";

export const SESSION_MIN = 12;
export const SESSION_MAX = 14;

// ---------------------------------------------------------------------------
// log.md -- brief.md §10 format:
//   DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | got stuck/wrong/slow
// ---------------------------------------------------------------------------

export interface LogEntry {
  date: string;
  standard: Standard;
  problem: string;
  wrote: string;
  outcome: string;
}

const KNOWN: ReadonlySet<string> = new Set<string>([
  "7.NS.A.1", "5.NBT.B.5", "8.EE.A.1", "8.EE.A.2", "7.EE.A.1",
  "7.EE.B.4", "8.EE.C.7b", "8.EE.C.8b", "8.F.A.1", "8.F.B.4",
]);

/**
 * Everything before this marker in log.md is documentation, including worked
 * examples that would otherwise parse as real entries.
 */
export const LOG_MARKER = "<!-- Real entries below this line. -->";

export function parseLog(text: string): LogEntry[] {
  const marker = text.indexOf(LOG_MARKER);
  const body = marker === -1 ? text : text.slice(marker + LOG_MARKER.length);

  const entries: LogEntry[] = [];
  for (const line of body.split("\n")) {
    const fields = line.split("|").map((f) => f.trim());
    if (fields.length < 5) continue;
    if (!KNOWN.has(fields[1]!)) continue; // skips headers, rules, prose
    entries.push({
      date: fields[0]!,
      standard: fields[1]! as Standard,
      problem: fields[2]!,
      wrote: fields[3]!,
      outcome: fields.slice(4).join(" | "),
    });
  }
  return entries;
}

/**
 * A miss is wrong or stuck. brief.md §10 distinguishes "slow, not wrong" and
 * asks that later successes be logged too -- neither is a miss to re-drill.
 *
 * The negation has to be stripped first. "slow, not wrong" is the brief's own
 * example, and a bare search for "wrong" counts it as a miss.
 */
export function misses(entries: readonly LogEntry[]): LogEntry[] {
  return entries.filter((e) => {
    const outcome = e.outcome.replace(/\bnot\s+(wrong|stuck)\b/gi, "");
    return /\b(wrong|stuck)\b/i.test(outcome);
  });
}

// ---------------------------------------------------------------------------
// assembly
// ---------------------------------------------------------------------------

export interface AssembleOptions {
  seed: number;
  date: string;
  count?: number;
  tiers?: Tier[];
  standards?: Standard[];
  missed?: readonly LogEntry[];
}

export interface AssembleResult {
  session: Session;
  /** Anything the assembler could not honour, stated plainly. */
  notes: string[];
  rejected: number;
}

const tierOf = (s: Standard): Tier => REGISTRY[s]!.tier;

function allocate(
  candidates: Standard[],
  count: number,
  missedStandards: Standard[],
  rng: RNG,
  notes: string[],
): Map<Standard, number> {
  const counts = new Map<Standard, number>(candidates.map((s) => [s, 0]));
  // No standard may exceed half the session, or no interleaving exists.
  const cap = Math.ceil(count / 2);
  const bump = (s: Standard): boolean => {
    const current = counts.get(s) ?? 0;
    if (current >= cap) return false;
    counts.set(s, current + 1);
    return true;
  };
  const total = () => [...counts.values()].reduce((a, b) => a + b, 0);

  // Rule 4: >= 2 items from standards she has missed.
  const recall = shuffle(missedStandards, rng);
  if (recall.length === 0) {
    notes.push(
      "No logged misses, so the spaced-recall rule (>= 2 items she missed) was not applied. Fill in log.md as she works.",
    );
  } else {
    for (let i = 0; i < 2; i++) bump(recall[i % recall.length]!);
  }

  // Rule 3: at least one tier-1 item, whatever tiers were asked for.
  const tierOne = shuffle(
    candidates.filter((s) => tierOf(s) === 1),
    rng,
  );
  const hasTierOne = [...counts.entries()].some(
    ([s, n]) => n > 0 && tierOf(s) === 1,
  );
  if (!hasTierOne) {
    if (tierOne.length === 0) {
      notes.push("No tier-1 generator available, so rule 3 could not be met.");
    } else {
      bump(tierOne[0]!);
    }
  }

  // Fill the rest round-robin, tier 1 first so the daily drilling stays dense.
  const order = [
    ...shuffle(candidates.filter((s) => tierOf(s) === 1), rng),
    ...shuffle(candidates.filter((s) => tierOf(s) !== 1), rng),
  ];
  let guard = 0;
  while (total() < count && guard++ < count * 20) {
    for (const s of order) {
      if (total() >= count) break;
      bump(s);
    }
  }
  if (total() < count) {
    notes.push(
      `Only ${total()} of ${count} items could be placed without one standard exceeding half the session.`,
    );
  }

  return counts;
}

/**
 * Greedy: always take from the largest remaining pool that is not the one
 * just used. Correct whenever no pool exceeds ceil(n/2), which allocate()
 * guarantees. Ties break on a seeded priority order, so this is deterministic.
 */
function interleave(groups: Map<Standard, Item[]>, rng: RNG): Item[] | null {
  const pools = [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([standard, items]) => ({ standard, items: [...items] }));
  const priority = shuffle(
    pools.map((p) => p.standard),
    rng,
  );

  const out: Item[] = [];
  let last: Standard | null = null;
  let remaining = pools.reduce((n, p) => n + p.items.length, 0);

  while (remaining > 0) {
    const eligible = pools.filter(
      (p) => p.items.length > 0 && p.standard !== last,
    );
    if (eligible.length === 0) return null;
    eligible.sort(
      (a, b) =>
        b.items.length - a.items.length ||
        priority.indexOf(a.standard) - priority.indexOf(b.standard),
    );
    const chosen = eligible[0]!;
    out.push(chosen.items.shift()!);
    last = chosen.standard;
    remaining--;
  }
  return out;
}

export function assemble(opts: AssembleOptions): AssembleResult {
  const notes: string[] = [];
  const count = opts.count ?? 13;
  if (count < SESSION_MIN || count > SESSION_MAX) {
    notes.push(
      `Session is ${count} items; brief.md §5 asks for ${SESSION_MIN}-${SESSION_MAX}.`,
    );
  }

  const requested = opts.standards ?? BUILT;
  const tiers = opts.tiers;
  const candidates = requested.filter((s) => {
    if (!REGISTRY[s]) return false;
    // Tier 1 is always eligible -- brief.md §5 rule 3.
    return !tiers || tiers.includes(tierOf(s)) || tierOf(s) === 1;
  });
  if (candidates.length === 0) throw new Error("no generators match that selection");
  if (candidates.length === 1) {
    notes.push(
      "Only one standard in play, so items cannot be interleaved. Use `drill` for single-standard practice.",
    );
  }

  const missedStandards = [
    ...new Set((opts.missed ?? []).map((m) => m.standard)),
  ].filter((s) => candidates.includes(s));

  const rng = new RNG(opts.seed);
  const counts = allocate(candidates, count, missedStandards, rng, notes);

  let rejected = 0;
  const groups = new Map<Standard, Item[]>();
  for (const [standard, n] of counts) {
    if (n === 0) continue;
    const gen = REGISTRY[standard] as Generator;
    groups.set(standard, generateItems(gen, rng, n, { onReject: () => rejected++ }));
  }

  const items = interleave(groups, rng);
  if (!items) throw new Error("could not interleave without adjacent repeats");

  return {
    session: { seed: opts.seed, date: opts.date, items },
    notes,
    rejected,
  };
}
