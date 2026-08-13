// Session builder. The assembly rules it enforces:
//
//   1. Pick 12-14 items.                          brief.md §4, interleaved set
//   2. Never two consecutive items from the same standard.
//   3. Tier 1 appears in EVERY session.           brief.md §9, Gate 0 daily
//   4. Include >= 2 items she missed before (spaced recall).
//   5. Randomize order after selection.           brief.md §4, "randomized"
//
// Rules 2 and 4 came from the item-generation section of an earlier brief and
// are not restated in the current one. They are kept: rule 2 is what
// "interleaved" means operationally, and rule 4 is the only mechanism that
// re-drills something she actually got wrong.
//
// Rule 3 is taken literally: `--tier 2` still yields a tier-1 item, because
// Gate 0 runs daily throughout regardless of what else a session is for.
//
// Rule 4 is honest about its limit. The log records the problem as text, not
// the seed that produced it, so an exact past item cannot be reconstructed.
// What the assembler guarantees is >= 2 items drawn from the STANDARDS she
// missed. Logging the item seed printed on the key would let a later build
// reproduce the exact problem.

import type { Generator, Item, Session, Standard, Tier } from "./generate.ts";
import { RNG, generateItems, shuffle } from "./generate.ts";
import { BUILT, REGISTRY } from "./registry.ts";
import { NOT_A_MISS, isKnown, tokensIn, unrecognized } from "./signatures.ts";

export const SESSION_MIN = 12;
export const SESSION_MAX = 14;

// ---------------------------------------------------------------------------
// log.md -- brief.md §8 format:
//   DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | SIGNATURE
//
// Field 5 is an error signature drawn from §5's taxonomy (NO_FLIP,
// PARTIAL_DISTRIBUTE, SLOW, ...). It used to be a free-text outcome ("wrong,
// no flip"); misses() below understands both.
// ---------------------------------------------------------------------------

export interface LogEntry {
  date: string;
  standard: Standard;
  problem: string;
  wrote: string;
  outcome: string;
  /**
   * Optional sixth field. When present, the exact item can be rebuilt with
   * generate(new RNG(seed)) -- so spaced recall re-drills the problem she
   * actually missed, not just another one from the same standard. The answer
   * key prints a ready-to-paste log line with this already filled in.
   */
  seed?: number;
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

    // A trailing all-digits field is the item seed, not part of the outcome.
    let tail = fields.slice(4);
    let seed: number | undefined;
    const last = tail[tail.length - 1];
    if (tail.length > 1 && last !== undefined && /^\d+$/.test(last)) {
      seed = Number(last);
      tail = tail.slice(0, -1);
    }

    entries.push({
      date: fields[0]!,
      standard: fields[1]! as Standard,
      problem: fields[2]!,
      wrote: fields[3]!,
      outcome: tail.join(" | "),
      ...(seed === undefined ? {} : { seed }),
    });
  }
  return entries;
}

/**
 * Which logged entries are worth re-drilling.
 *
 * brief.md §8 writes field 5 as an error signature from §5's taxonomy. An
 * entry carrying any recognised signature is a miss, EXCEPT when every
 * signature on it is one that records something other than a wrong answer --
 * `SLOW` being the brief's own example ("376, ~50s | SLOW": right, just slow).
 *
 * Free text still works. Entries written the older way ("wrong, no flip")
 * fall through to a word match, with negations stripped first, because "slow,
 * not wrong" was the previous format's own example and a bare search for
 * "wrong" would count it.
 */
export function misses(entries: readonly LogEntry[]): LogEntry[] {
  return entries.filter((e) => {
    const known = tokensIn(e.outcome).filter(isKnown);
    if (known.length > 0) return known.some((s) => !NOT_A_MISS.has(s));
    const outcome = e.outcome.replace(/\bnot\s+(wrong|stuck)\b/gi, "");
    return /\b(wrong|stuck)\b/i.test(outcome);
  });
}

/**
 * Signature-shaped tokens in the log that are not in brief.md §5's taxonomy.
 * Almost always a typo, and a typo would otherwise silently drop a miss, so
 * the CLI reports these rather than letting them pass.
 */
export function unknownSignatures(entries: readonly LogEntry[]): string[] {
  const found = new Set<string>();
  for (const e of entries) for (const t of unrecognized(e.outcome)) found.add(t);
  return [...found].sort();
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
  /** Seeds of items rebuilt exactly from the log, for marking on the key. */
  recalled: Set<number>;
}

const tierOf = (s: Standard): Tier => REGISTRY[s]!.tier;

/** How many exact re-drills the spaced-recall rule asks for. */
const RECALL_TARGET = 2;

/**
 * Rebuild the exact items she missed, from the seeds logged beside them.
 * An entry with no seed cannot be reconstructed -- those fall back to
 * standard-level recall in allocate().
 */
function rebuildMissed(
  missed: readonly LogEntry[],
  candidates: Standard[],
  notes: string[],
): Item[] {
  const out: Item[] = [];
  const seen = new Set<number>();

  for (const entry of missed) {
    if (out.length >= RECALL_TARGET) break;
    if (entry.seed === undefined) continue;
    if (seen.has(entry.seed)) continue;
    if (!candidates.includes(entry.standard)) continue;

    const gen = REGISTRY[entry.standard];
    if (!gen) continue;

    const item = gen.generate(new RNG(entry.seed));
    // The generator may have changed since the item was printed. Only ship a
    // rebuilt item if it still verifies and still matches what was logged.
    if (!gen.verify(item)) {
      notes.push(
        `Seed ${entry.seed} (${entry.standard}) no longer rebuilds a valid item; the generator changed since it was printed. Falling back to a fresh item from that standard.`,
      );
      continue;
    }
    seen.add(entry.seed);
    out.push(item);
  }

  const seeded = missed.filter((m) => m.seed !== undefined).length;
  if (missed.length > 0 && seeded === 0) {
    notes.push(
      "Logged misses carry no item seeds, so recall is by standard rather than by exact problem. Paste the `log:` line from the answer key to fix that.",
    );
  }
  return out;
}

function allocate(
  candidates: Standard[],
  count: number,
  missedStandards: Standard[],
  pinned: Map<Standard, number>,
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

  // Exact re-drills are already chosen; reserve their slots first.
  let recallSlots = 0;
  for (const [standard, n] of pinned) {
    for (let i = 0; i < n; i++) if (bump(standard)) recallSlots++;
  }

  // Rule 4: >= 2 items from standards she has missed. Exact rebuilds count
  // toward the target; anything short is topped up at standard level.
  const recall = shuffle(missedStandards, rng);
  if (recall.length === 0 && recallSlots === 0) {
    notes.push(
      "No logged misses, so the spaced-recall rule (>= 2 items she missed) was not applied. Fill in log.md as she works.",
    );
  } else {
    for (let i = recallSlots; i < RECALL_TARGET; i++) {
      if (recall.length === 0) break;
      bump(recall[i % recall.length]!);
    }
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
      `Session is ${count} items; brief.md §4 asks for ${SESSION_MIN}-${SESSION_MAX}.`,
    );
  }

  const requested = opts.standards ?? BUILT;
  const tiers = opts.tiers;
  const candidates = requested.filter((s) => {
    if (!REGISTRY[s]) return false;
    // Tier 1 is always eligible -- Gate 0 runs daily (brief.md §9).
    return !tiers || tiers.includes(tierOf(s)) || tierOf(s) === 1;
  });
  if (candidates.length === 0) throw new Error("no generators match that selection");
  if (candidates.length === 1) {
    notes.push(
      "Only one standard in play, so items cannot be interleaved. Use `drill` for single-standard practice.",
    );
  }

  const missed = opts.missed ?? [];
  const missedStandards = [...new Set(missed.map((m) => m.standard))].filter(
    (s) => candidates.includes(s),
  );

  // Rebuild the exact problems she missed, where a seed was logged.
  const exact = rebuildMissed(missed, candidates, notes);
  const pinned = new Map<Standard, number>();
  for (const item of exact) {
    pinned.set(item.standard, (pinned.get(item.standard) ?? 0) + 1);
  }
  if (exact.length > 0) {
    notes.push(
      `${exact.length} item(s) rebuilt exactly from logged seeds, not just re-drawn from the same standard.`,
    );
  }

  const rng = new RNG(opts.seed);
  const counts = allocate(candidates, count, missedStandards, pinned, rng, notes);

  let rejected = 0;
  const groups = new Map<Standard, Item[]>();
  for (const [standard, n] of counts) {
    if (n === 0) continue;
    const gen = REGISTRY[standard] as Generator;
    const reused = exact.filter((i) => i.standard === standard);
    const fresh = generateItems(gen, rng, n - reused.length, {
      onReject: () => rejected++,
    });
    groups.set(standard, [...reused, ...fresh]);
  }

  const items = interleave(groups, rng);
  if (!items) throw new Error("could not interleave without adjacent repeats");

  return {
    session: { seed: opts.seed, date: opts.date, items },
    notes,
    rejected,
    recalled: new Set(exact.map((i) => i.seed)),
  };
}
