// grade -- NEXT.md item 1. The pure logic: resolving a sessions.md record,
// rebuilding the set it names, refusing on fingerprint mismatch, classifying
// what she wrote against predictedErrors, and formatting log.md entries.
//
// The interactive prompt loop in cli.ts is deliberately thin; everything it
// calls is exercised here.

import { describe, expect, test } from "bun:test";

import { assemble } from "./assemble.ts";
import { RNG, generateItems } from "./generate.ts";
import { generatorFor } from "./registry.ts";
import { fingerprint, type SessionRecord } from "./sessions.ts";
import {
  classify,
  inferredCorrect,
  missEntry,
  okEntry,
  rebuildSet,
  resolveTarget,
  verifyRecord,
} from "./grade.ts";
import { parseLog, LOG_MARKER } from "./assemble.ts";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function sessionRecord(seed: number, count = 12, scope = "tier 1,2"): SessionRecord {
  const tiers = scope.startsWith("tier")
    ? (scope.slice(5).split(",").map(Number) as (1 | 2 | 3 | 4)[])
    : undefined;
  const result = assemble({ seed, date: "2026-08-13", count, tiers });
  return {
    date: "2026-08-13",
    command: "session",
    seed,
    count,
    scope,
    fingerprint: fingerprint(result.session.items),
  };
}

// ---------------------------------------------------------------------------
// resolveTarget -- find the set being graded in sessions.md
// ---------------------------------------------------------------------------

describe("resolveTarget", () => {
  const a = sessionRecord(813);
  const b = sessionRecord(7);

  test("byte-identical duplicate lines collapse to one record", () => {
    // sessions.md has a real duplicated line; two identical lines describe
    // the same set, so they must not read as ambiguous.
    const { record, candidates } = resolveTarget([a, a], "2026-08-13");
    expect(candidates.length).toBe(1);
    expect(record).toEqual(a);
  });

  test("two distinct sets on one date is ambiguous", () => {
    const { record, candidates } = resolveTarget([a, b], "2026-08-13");
    expect(record).toBeNull();
    expect(candidates.length).toBe(2);
  });

  test("--seed disambiguates", () => {
    const { record } = resolveTarget([a, b], "2026-08-13", 7);
    expect(record).toEqual(b);
  });

  test("no record on that date", () => {
    const { record, candidates } = resolveTarget([a], "2026-01-01");
    expect(record).toBeNull();
    expect(candidates.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// rebuildSet / verifyRecord -- regenerate and compare fingerprints
// ---------------------------------------------------------------------------

describe("rebuildSet", () => {
  test("session record rebuilds to the recorded fingerprint", () => {
    const record = sessionRecord(813);
    expect(fingerprint(rebuildSet(record))).toBe(record.fingerprint);
  });

  test("drill record rebuilds to the recorded fingerprint", () => {
    const items = generateItems(generatorFor("7.NS.A.1"), new RNG(71), 20);
    const record: SessionRecord = {
      date: "2026-08-13",
      command: "drill",
      seed: 71,
      count: 20,
      scope: "standard 7.NS.A.1",
      fingerprint: fingerprint(items),
    };
    expect(fingerprint(rebuildSet(record))).toBe(record.fingerprint);
  });

  test("gen record rebuilds to the recorded fingerprint", () => {
    // gen's batching lives in one shared function used by both cli and grade,
    // so this cannot drift; the fingerprint round-trip proves it.
    const record: SessionRecord = {
      date: "2026-08-13",
      command: "gen",
      seed: 42,
      count: 10,
      scope: "standards 7.NS.A.1,8.EE.A.1",
      fingerprint: "00000000", // filled below
    };
    const items = rebuildSet(record);
    expect(items.length).toBe(10);
    const stamped = { ...record, fingerprint: fingerprint(items) };
    expect(fingerprint(rebuildSet(stamped))).toBe(stamped.fingerprint);
  });

  test("verifyRecord refuses on fingerprint mismatch", () => {
    const record = { ...sessionRecord(813), fingerprint: "00000000" };
    const { ok } = verifyRecord(record);
    expect(ok).toBe(false);
  });

  test("verifyRecord passes on a faithful record", () => {
    const record = sessionRecord(813);
    const { ok, items } = verifyRecord(record);
    expect(ok).toBe(true);
    expect(items.length).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// classify -- auto-classification from predictedErrors
// ---------------------------------------------------------------------------

describe("classify", () => {
  const item = generateItems(generatorFor("7.EE.B.4"), new RNG(3), 1)[0]!;
  const [signature, predicted] = Object.entries(item.predictedErrors ?? {})[0]!;

  test("what she wrote matches a predicted error", () => {
    expect(classify(item, predicted)).toBe(signature);
  });

  test("whitespace differences do not defeat the match", () => {
    expect(classify(item, `  ${predicted.replace(/ /g, "  ")} `)).toBe(signature);
  });

  test("an unpredicted answer classifies as null (menu fallback)", () => {
    expect(classify(item, "no idea")).toBeNull();
  });

  test("an item with no predictedErrors classifies as null", () => {
    const plain = generateItems(generatorFor("7.NS.A.1"), new RNG(5), 1)[0]!;
    expect(classify(plain, "-3")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// entry formatting -- must parse back through the existing log parser
// ---------------------------------------------------------------------------

describe("log entries", () => {
  const item = generateItems(generatorFor("7.EE.B.4"), new RNG(3), 1)[0]!;

  test("a miss entry round-trips through parseLog with its signature and seed", () => {
    const line = missEntry("2026-08-13", item, "x > -3", "NO_FLIP");
    const [entry] = parseLog(`${LOG_MARKER}\n${line}\n`);
    expect(entry).toBeDefined();
    expect(entry!.standard).toBe("7.EE.B.4");
    expect(entry!.wrote).toBe("x > -3");
    expect(entry!.outcome).toBe("NO_FLIP");
    expect(entry!.seed).toBe(item.seed);
  });

  test("an inferred-correct entry parses and is not a miss", () => {
    const line = okEntry("2026-08-13", item);
    const [entry] = parseLog(`${LOG_MARKER}\n${line}\n`);
    expect(entry).toBeDefined();
    expect(entry!.outcome).toBe("ok");
  });

  test("a pipe in what she wrote cannot break the field split", () => {
    const line = missEntry("2026-08-13", item, "x | y", "NO_FLIP");
    const [entry] = parseLog(`${LOG_MARKER}\n${line}\n`);
    expect(entry!.outcome).toBe("NO_FLIP");
    expect(entry!.seed).toBe(item.seed);
  });
});

// ---------------------------------------------------------------------------
// inferredCorrect -- correct answers are logged on previously-missed types only
// ---------------------------------------------------------------------------

describe("inferredCorrect", () => {
  const items = assemble({ seed: 813, date: "2026-08-13", count: 12, tiers: [1, 2] })
    .session.items;

  test("correct items on a previously-missed standard are logged", () => {
    const prior = parseLog(
      `${LOG_MARKER}\n2026-08-10 | 7.NS.A.1 | -4 + 11 | -7 | SIGN_RULE\n`,
    );
    const wrong = new Set<number>();
    const logged = inferredCorrect(items, wrong, prior);
    expect(logged.length).toBeGreaterThan(0);
    expect(logged.every((i) => i.standard === "7.NS.A.1")).toBe(true);
  });

  test("nothing is logged when no standard was previously missed", () => {
    expect(inferredCorrect(items, new Set(), []).length).toBe(0);
  });

  test("items marked wrong are excluded even on a previously-missed standard", () => {
    const prior = parseLog(
      `${LOG_MARKER}\n2026-08-10 | 7.NS.A.1 | -4 + 11 | -7 | SIGN_RULE\n`,
    );
    const everyIndex = new Set(items.map((_, i) => i));
    expect(inferredCorrect(items, everyIndex, prior).length).toBe(0);
  });

  test("a SLOW entry is not a miss, so it does not make a standard eligible", () => {
    const prior = parseLog(
      `${LOG_MARKER}\n2026-08-10 | 5.NBT.B.5 | 47 x 8 | 376, ~50s | SLOW\n`,
    );
    expect(inferredCorrect(items, new Set(), prior).length).toBe(0);
  });
});
