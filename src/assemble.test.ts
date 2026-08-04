import { describe, expect, test } from "bun:test";

import {
  LOG_MARKER,
  SESSION_MAX,
  SESSION_MIN,
  assemble,
  misses,
  parseLog,
  type LogEntry,
} from "./assemble.ts";
import { REGISTRY } from "./registry.ts";
import { renderKey, renderSet } from "./render.ts";

const SEEDS = [1, 2, 3, 7, 13, 42, 99, 256, 1024, 65535];

const build = (over: Partial<Parameters<typeof assemble>[0]> = {}) =>
  assemble({ seed: 42, date: "2026-08-04", ...over });

// ---------------------------------------------------------------------------
// the three assembler tests from spec.md
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
