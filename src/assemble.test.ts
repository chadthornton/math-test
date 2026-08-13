import { describe, expect, test } from "bun:test";

import {
  LOG_MARKER,
  SESSION_MAX,
  SESSION_MIN,
  assemble,
  misses,
  parseLog,
  unknownSignatures,
  type LogEntry,
} from "./assemble.ts";
import { SIGNATURES, isKnown } from "./signatures.ts";
import { REGISTRY } from "./registry.ts";
import { renderKey, renderSet } from "./render.ts";

const SEEDS = [1, 2, 3, 7, 13, 42, 99, 256, 1024, 65535];

const build = (over: Partial<Parameters<typeof assemble>[0]> = {}) =>
  assemble({ seed: 42, date: "2026-08-04", ...over });

// ---------------------------------------------------------------------------
// the three specified assembler tests
// ---------------------------------------------------------------------------

describe("assembler rules", () => {
  test("no two consecutive items share a standard", () => {
    for (const seed of SEEDS) {
      for (const count of [SESSION_MIN, 13, SESSION_MAX]) {
        const { session } = build({ seed, count });
        expect(session.items).toHaveLength(count);
        for (let i = 1; i < session.items.length; i++) {
          expect(session.items[i]!.standard).not.toBe(
            session.items[i - 1]!.standard,
          );
        }
      }
    }
  });

  test("every session contains at least one tier-1 item", () => {
    for (const seed of SEEDS) {
      const { session } = build({ seed });
      expect(session.items.some((i) => i.tier === 1)).toBe(true);
    }
  });

  test("every session contains at least 2 items from the missed list", () => {
    const missed: LogEntry[] = [
      {
        date: "Aug 6",
        standard: "8.EE.A.2",
        problem: "sqrt(72)",
        wrote: "2 sqrt(18)",
        outcome: "wrong, not fully simplified",
      },
    ];
    for (const seed of SEEDS) {
      const { session } = build({ seed, missed });
      const drawn = session.items.filter((i) => i.standard === "8.EE.A.2");
      expect(drawn.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ---------------------------------------------------------------------------
// the rules the brief states that the spec's three tests do not cover
// ---------------------------------------------------------------------------

describe("assembler, brief §5", () => {
  test("tier 1 appears even when only tier 2 was asked for (rule 3)", () => {
    for (const seed of SEEDS) {
      const { session } = build({ seed, tiers: [2] });
      expect(session.items.some((i) => i.tier === 1)).toBe(true);
      expect(session.items.some((i) => i.tier === 2)).toBe(true);
    }
  });

  test("no standard takes over more than half the session", () => {
    for (const seed of SEEDS) {
      const { session } = build({ seed });
      const counts = new Map<string, number>();
      for (const i of session.items) {
        counts.set(i.standard, (counts.get(i.standard) ?? 0) + 1);
      }
      for (const n of counts.values()) {
        expect(n).toBeLessThanOrEqual(Math.ceil(session.items.length / 2));
      }
    }
  });

  test("items are not sorted by standard, tier, or difficulty (rule 5)", () => {
    const { session } = build({ seed: 5 });
    const tiers = session.items.map((i) => i.tier);
    expect(tiers).not.toEqual([...tiers].sort());
  });

  test("an empty log is reported, not silently ignored", () => {
    const { notes } = build({ missed: [] });
    expect(notes.some((n) => n.includes("spaced-recall"))).toBe(true);
  });

  test("a session outside 12-14 items is flagged", () => {
    expect(build({ count: 6 }).notes.some((n) => n.includes("12-14"))).toBe(true);
    expect(build({ count: 13 }).notes.some((n) => n.includes("12-14"))).toBe(false);
  });

  test("every assembled item passes its own standard's verifier", () => {
    for (const seed of SEEDS) {
      for (const item of build({ seed }).session.items) {
        expect(REGISTRY[item.standard]!.verify(item)).toBe(true);
      }
    }
  });

  test("a seed reproduces the session byte for byte", () => {
    const a = build({ seed: 7 }).session;
    const b = build({ seed: 7 }).session;
    expect(renderSet(a)).toBe(renderSet(b));
    expect(renderKey(a)).toBe(renderKey(b));
  });

  test("different seeds give different sessions", () => {
    expect(renderSet(build({ seed: 1 }).session)).not.toBe(
      renderSet(build({ seed: 2 }).session),
    );
  });
});

// ---------------------------------------------------------------------------
// log.md parsing
// ---------------------------------------------------------------------------

describe("parseLog", () => {
  const log = [
    "# Error log",
    "Aug 6 | 7.EE.B.4 | this is an example | x > -3 | wrong, no flip",
    LOG_MARKER,
    "Aug 6 | 7.EE.A.1 | 7x - 2(3x - 5) + 4 | wrote x - 6 | wrong, dropped 2nd distribute",
    "Aug 6 | 5.NBT.B.5 | 47 x 8 | correct but ~50s | slow, not wrong",
    "Aug 7 | 8.EE.A.2 | sqrt(72) | 2 sqrt(18) | wrong, not maximal",
    "Aug 8 | 7.EE.A.1 | 3x + 2(x - 4) | 5x - 8 | correct after previously missing",
    "Aug 6 | struggled with inequalities",
    "",
  ].join("\n");

  test("reads the five-field format from brief §10", () => {
    const entries = parseLog(log);
    expect(entries).toHaveLength(4);
    expect(entries[0]!.standard).toBe("7.EE.A.1");
    expect(entries[0]!.wrote).toBe("wrote x - 6");
  });

  test("ignores the worked examples above the marker", () => {
    expect(parseLog(log).some((e) => e.problem.includes("example"))).toBe(false);
  });

  test("ignores prose and useless entries", () => {
    expect(parseLog(log).some((e) => e.date.includes("struggled"))).toBe(false);
  });

  test("slow is not a miss; wrong and stuck are", () => {
    const found = misses(parseLog(log));
    expect(found.map((e) => e.standard).sort()).toEqual(["7.EE.A.1", "8.EE.A.2"]);
  });

  test("a negated outcome is not a miss", () => {
    // "slow, not wrong" is the brief's own example. A bare search for the
    // word "wrong" counts it as a miss, which would re-drill a skill she has.
    const negated = [
      LOG_MARKER,
      "Aug 6 | 5.NBT.B.5 | 47 x 8 | correct but ~50s | slow, not wrong",
      "Aug 6 | 7.NS.A.1 | -7 - (-12) | 5 | not stuck, just slow",
      "Aug 6 | 8.EE.A.1 | x^3 * x^5 | x^15 | wrong",
    ].join("\n");
    expect(misses(parseLog(negated)).map((e) => e.standard)).toEqual(["8.EE.A.1"]);
  });

  test("a later success is not re-drilled as a miss", () => {
    expect(
      misses(parseLog(log)).some((e) => e.outcome.includes("correct after")),
    ).toBe(false);
  });

  test("an empty log parses to nothing rather than throwing", () => {
    expect(parseLog("")).toEqual([]);
    expect(parseLog("# just a heading\n")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// error signatures -- brief.md §5 taxonomy, §8 field 5
// ---------------------------------------------------------------------------

describe("signature classification", () => {
  const log = [
    LOG_MARKER,
    "Aug 15 | 7.EE.B.4 | -3x + 2 > 11 | x > -3 | NO_FLIP | 2581720956",
    "Aug 15 | 7.EE.A.1 | 7x - 2(3x - 5) + 4 | x - 6 | PARTIAL_DISTRIBUTE",
    "Aug 15 | 5.NBT.B.5 | 47 x 8 | 376, ~50s | SLOW",
  ].join("\n");

  test("a signature-format log classifies misses", () => {
    // This is the whole point: before signatures were understood, every one of
    // these read as zero misses and --from-log degraded to a normal session.
    const found = misses(parseLog(log));
    expect(found.map((e) => e.standard)).toEqual(["7.EE.B.4", "7.EE.A.1"]);
  });

  test("SLOW is not a miss -- the answer was right", () => {
    expect(misses(parseLog(log)).some((e) => e.outcome.includes("SLOW"))).toBe(false);
  });

  test("a signature alongside SLOW still counts", () => {
    const both = `${LOG_MARKER}\nAug 15 | 7.NS.A.1 | -4 + 11 | 7 | SIGN_RULE, SLOW`;
    expect(misses(parseLog(both))).toHaveLength(1);
  });

  test("the older free-text format still works", () => {
    const legacy = [
      LOG_MARKER,
      "Aug 6 | 7.EE.B.4 | -3x + 2 > 11 | x > -3 | wrong, no flip",
      "Aug 6 | 5.NBT.B.5 | 47 x 8 | 376 | slow, not wrong",
    ].join("\n");
    expect(misses(parseLog(legacy)).map((e) => e.standard)).toEqual(["7.EE.B.4"]);
  });

  test("every signature in the taxonomy is recognised", () => {
    for (const list of Object.values(SIGNATURES)) {
      for (const sig of list) expect(isKnown(sig)).toBe(true);
    }
  });

  test("a typo'd signature is surfaced, not silently dropped", () => {
    // NO_FILP would otherwise classify as "no signature, no wrong/stuck" and
    // vanish -- the exact silent failure this replaced.
    const typo = `${LOG_MARKER}\nAug 15 | 7.EE.B.4 | -3x + 2 > 11 | x > -3 | NO_FILP`;
    expect(unknownSignatures(parseLog(typo))).toEqual(["NO_FILP"]);
    expect(unknownSignatures(parseLog(log))).toEqual([]);
  });

  test("5.NBT.B.5 signatures still parse though it has no generator", () => {
    expect(isKnown("PLACE_VALUE")).toBe(true);
    expect(parseLog(log).some((e) => e.standard === "5.NBT.B.5")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// exact-item spaced recall: the sixth log field
// ---------------------------------------------------------------------------

describe("recall by seed", () => {
  const withSeed = (seed: number, standard = "7.NS.A.1") =>
    [
      LOG_MARKER,
      `Aug 4 | ${standard} | whatever | wrong thing | wrong | ${seed}`,
    ].join("\n");

  test("the sixth field is read as a seed, not as part of the outcome", () => {
    const entry = parseLog(withSeed(3277083196))[0]!;
    expect(entry.seed).toBe(3277083196);
    expect(entry.outcome).toBe("wrong");
  });

  test("an entry with no seed still parses", () => {
    const entry = parseLog(
      `${LOG_MARKER}\nAug 4 | 7.NS.A.1 | -4 + 11 | 7 | wrong, sign`,
    )[0]!;
    expect(entry.seed).toBeUndefined();
    expect(entry.outcome).toBe("wrong, sign");
  });

  test("a number inside the outcome is not mistaken for a seed", () => {
    const entry = parseLog(
      `${LOG_MARKER}\nAug 4 | 5.NBT.B.5 | 47 x 8 | 376 | correct but 50s, wrong earlier`,
    )[0]!;
    expect(entry.seed).toBeUndefined();
  });

  test("a logged seed rebuilds that exact item in a later session", () => {
    // Take a real item out of one session...
    const source = build({ seed: 3, count: 12 }).session.items.find(
      (i) => i.standard === "7.NS.A.1",
    )!;

    // ...and ask for a completely different session that knows only its seed.
    const later = build({
      seed: 999,
      date: "2026-08-05",
      count: 12,
      missed: parseLog(withSeed(source.seed)),
    });

    const rebuilt = later.session.items.find((i) => i.seed === source.seed);
    expect(rebuilt).toBeDefined();
    expect(rebuilt!.prompt).toBe(source.prompt);
    expect(rebuilt!.solution).toBe(source.solution);
    expect(later.recalled.has(source.seed)).toBe(true);
  });

  test("the key marks a rebuilt item as spaced recall", () => {
    const source = build({ seed: 3, count: 12 }).session.items[0]!;
    const later = build({
      seed: 999,
      count: 12,
      missed: parseLog(withSeed(source.seed, source.standard)),
    });
    const key = renderKey(later.session, { recall: later.recalled });
    expect(key).toContain("spaced recall");
    expect(renderKey(later.session)).not.toContain("spaced recall");
  });

  test("recall still meets the >= 2 rule when only one seed was logged", () => {
    const source = build({ seed: 3, count: 12 }).session.items.find(
      (i) => i.standard === "8.EE.A.2",
    )!;
    const { session } = build({
      seed: 5,
      count: 12,
      missed: parseLog(withSeed(source.seed, "8.EE.A.2")),
    });
    expect(
      session.items.filter((i) => i.standard === "8.EE.A.2").length,
    ).toBeGreaterThanOrEqual(2);
  });

  test("seedless misses are reported so the fix is discoverable", () => {
    const { notes } = build({
      missed: parseLog(`${LOG_MARKER}\nAug 4 | 7.NS.A.1 | -4 + 11 | 7 | wrong`),
    });
    expect(notes.some((n) => n.includes("no item seeds"))).toBe(true);
  });

  test("every key prints a paste-ready log line carrying the seed", () => {
    const { session } = build({ seed: 11, count: 12 });
    const key = renderKey(session);
    for (const item of session.items) {
      expect(key).toContain(`| ${item.seed}`);
    }
    expect((key.match(/^log: /gm) ?? []).length).toBe(session.items.length);
  });

  test("the log line names the problem, not the instruction", () => {
    const { session } = build({ seed: 5, count: 13 });
    const key = renderKey(session);
    const problems = (key.match(/^log: .+$/gm) ?? []).map(
      (l) => l.split("|")[2]!.trim(),
    );
    expect(problems).toHaveLength(session.items.length);
    for (const p of problems) {
      expect(p.length).toBeGreaterThan(0);
      // These are instruction fragments that used to land here because the
      // helper took the prompt's last line.
      expect(p).not.toMatch(/sentence with units|Define your variable/);
      // And a multi-word directive used to survive the strip.
      expect(p).not.toMatch(/^(Evaluate|Simplify|Solve|Multiply)\b.*:/);
    }
  });

  test("a system logs both equations, not just the second", () => {
    const { session } = build({ seed: 5, count: 13 });
    const key = renderKey(session);
    const line = (key.match(/^log: .+8\.EE\.C\.8b.+$/gm) ?? [])[0];
    expect(line).toBeDefined();
    const problem = line!.split("|")[2]!;
    expect(problem).toContain(";");
    expect((problem.match(/=/g) ?? []).length).toBe(2);
  });

  test("a printed log line round-trips back through the parser", () => {
    const { session } = build({ seed: 11, count: 12 });
    const lines = (renderKey(session).match(/^log: .+$/gm) ?? []).map((l) =>
      // What a parent does: drop the prefix, fill the two blanks.
      l.replace(/^log: /, "").replace("|  |  |", "| x + 1 | wrong |"),
    );
    const entries = parseLog([LOG_MARKER, ...lines].join("\n"));
    expect(entries).toHaveLength(session.items.length);
    expect(entries.map((e) => e.seed)).toEqual(session.items.map((i) => i.seed));
    expect(misses(entries)).toHaveLength(session.items.length);
  });
});
