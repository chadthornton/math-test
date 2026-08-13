// grade -- turn "which were wrong, and what she wrote" into log.md entries.
//
// The instructor supplies exactly two things. Everything else the tool
// already knows, because it generated the set:
//
//   $ bun run grade --date 2026-08-13
//   12 items in this set. Which were wrong?  3, 7, 11
//   Item 3   -3x + 2 > 11   (correct: x < -3)
//   she wrote:  x > -3
//   -> NO_FLIP                                  [logged]
//
// The safety property is the fingerprint check: the set is found through
// sessions.md, regenerated, and compared. On a mismatch grading is REFUSED --
// a generator change between printing and grading would otherwise silently
// attach her answers to problems she never saw.
//
// This module is the pure logic; the prompt loop lives in cli.ts and stays
// thin. Everything here is exercised by grade.test.ts.

import { misses, type LogEntry } from "./assemble.ts";
import { assemble } from "./assemble.ts";
import {
  RNG,
  generateItems,
  type GenerateOptions,
  type Item,
  type Standard,
  type Tier,
} from "./generate.ts";
import { logProblem } from "./render.ts";
import { generatorFor } from "./registry.ts";
import { fingerprint, formatRecord, type SessionRecord } from "./sessions.ts";

// ---------------------------------------------------------------------------
// finding the set
// ---------------------------------------------------------------------------

export interface ResolveResult {
  /** Set when exactly one distinct record matches. */
  record: SessionRecord | null;
  /** Distinct matching records, for the "which did you mean" message. */
  candidates: SessionRecord[];
}

/**
 * Find the record being graded. Byte-identical lines describe the same set
 * (sessions.md has at least one real duplicated line), so they collapse to
 * one candidate; only genuinely different invocations are ambiguous, and a
 * seed narrows those.
 */
export function resolveTarget(
  records: readonly SessionRecord[],
  date: string,
  seed?: number,
): ResolveResult {
  const matching = records.filter(
    (r) => r.date === date && (seed === undefined || r.seed === seed),
  );
  const candidates = [
    ...new Map(matching.map((r) => [formatRecord(r), r])).values(),
  ];
  return {
    record: candidates.length === 1 ? candidates[0]! : null,
    candidates,
  };
}

// ---------------------------------------------------------------------------
// rebuilding the set
// ---------------------------------------------------------------------------

/**
 * The `gen` command's batching, shared with cli.ts so the two call sites
 * cannot drift -- if they did, every gen record would fingerprint-mismatch.
 */
export function genItems(
  standards: readonly Standard[],
  count: number,
  rng: RNG,
  opts: GenerateOptions = {},
): Item[] {
  const batches = standards.map((s) =>
    generateItems(generatorFor(s), rng, Math.ceil(count / standards.length), opts),
  );
  const items: Item[] = [];
  for (let i = 0; items.length < count; i++) {
    for (const batch of batches) {
      if (batch[i] && items.length < count) items.push(batch[i]!);
    }
  }
  return items;
}

/**
 * Regenerate the items a record describes. Anything this cannot reproduce
 * faithfully (a `session --from-log` whose log has since changed, a session
 * scoped by --standards, which the scope field does not record) comes out as
 * a fingerprint mismatch downstream -- refusal, never a silent wrong set.
 */
export function rebuildSet(record: SessionRecord): Item[] {
  const { command, seed, count, scope } = record;

  if (command === "session") {
    const tiers = scope.startsWith("tier ")
      ? (scope.slice(5).split(",").map(Number) as Tier[])
      : undefined;
    return assemble({ seed, date: record.date, count, tiers }).session.items;
  }

  if (command === "drill") {
    if (!scope.startsWith("standard ")) {
      throw new Error(`drill record has no standard in its scope: "${scope}"`);
    }
    const standard = scope.slice("standard ".length);
    return generateItems(generatorFor(standard), new RNG(seed), count);
  }

  if (command === "gen") {
    if (!scope.startsWith("standards ")) {
      throw new Error(`gen record has no standards in its scope: "${scope}"`);
    }
    const standards = scope
      .slice("standards ".length)
      .split(",")
      .map((s) => s.trim()) as Standard[];
    return genItems(standards, count, new RNG(seed));
  }

  throw new Error(`cannot rebuild a "${command}" record`);
}

export interface VerifyResult {
  items: Item[];
  fingerprint: string;
  /** False means REFUSE to log -- the regenerated set is not what she held. */
  ok: boolean;
}

export function verifyRecord(record: SessionRecord): VerifyResult {
  const items = rebuildSet(record);
  const fp = fingerprint(items);
  return { items, fingerprint: fp, ok: fp === record.fingerprint };
}

// ---------------------------------------------------------------------------
// classifying what she wrote
// ---------------------------------------------------------------------------

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

/**
 * Match what she wrote against the item's predicted errors. Null means the
 * caller falls back to the signature menu -- which the spec says is the
 * right answer for everything not computable, not a failure.
 */
export function classify(item: Item, wrote: string): string | null {
  const written = normalize(wrote);
  for (const [signature, predicted] of Object.entries(item.predictedErrors ?? {})) {
    if (normalize(predicted) === written) return signature;
  }
  return null;
}

// ---------------------------------------------------------------------------
// writing entries -- log.md's six-field format, nothing else
// ---------------------------------------------------------------------------

/** Field 4 is verbatim, but a pipe would break the field split. */
const field = (s: string): string => normalize(s).replace(/\|/g, "/");

export function missEntry(
  date: string,
  item: Item,
  wrote: string,
  signature: string,
): string {
  return [date, item.standard, logProblem(item), field(wrote), signature, item.seed].join(
    " | ",
  );
}

/**
 * An inferred-correct entry. "Also log correct answers on previously-missed
 * types -- that is the only signal a gate is closing" (log.md). Field 5 is
 * `ok`: not signature-shaped, so it can never read as a miss.
 */
export function okEntry(date: string, item: Item): string {
  return [date, item.standard, logProblem(item), field(item.solution), "ok", item.seed].join(
    " | ",
  );
}

/**
 * Which unmarked items get an inferred-correct entry: those on a standard
 * with a genuine prior miss. Everything else stays unlogged -- twelve `ok`
 * lines a day would bury the signal the gate check reads.
 */
export function inferredCorrect(
  items: readonly Item[],
  wrongIndices: ReadonlySet<number>,
  prior: readonly LogEntry[],
): Item[] {
  const missedStandards = new Set(misses(prior).map((e) => e.standard));
  return items.filter(
    (item, i) => !wrongIndices.has(i) && missedStandards.has(item.standard),
  );
}
