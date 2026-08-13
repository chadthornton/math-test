import { describe, expect, test } from "bun:test";

import { RNG, generateItems } from "./generate.ts";
import { generatorFor } from "./registry.ts";
import { assemble } from "./assemble.ts";
import {
  SESSIONS_MARKER,
  fingerprint,
  formatRecord,
  invocationOf,
  parseSessions,
  type SessionRecord,
} from "./sessions.ts";

const record: SessionRecord = {
  date: "2026-08-13",
  command: "session",
  seed: 813,
  count: 12,
  scope: "tier 1,2",
  fingerprint: "e03f51e5",
};

describe("session index", () => {
  test("a line round-trips through the parser", () => {
    const parsed = parseSessions(
      `${SESSIONS_MARKER}\n${formatRecord(record)}\n`,
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(record);
  });

  test("documentation above the marker is not parsed", () => {
    const text = [
      "# Session index",
      "2026-08-01 | session | seed 1 | count 1 | - | fp aaaaaaaa",
      SESSIONS_MARKER,
      formatRecord(record),
    ].join("\n");
    expect(parseSessions(text)).toHaveLength(1);
    expect(parseSessions(text)[0]!.seed).toBe(813);
  });

  test("malformed lines are skipped, not thrown on", () => {
    const text = [
      SESSIONS_MARKER,
      "not a session line at all",
      "2026-08-13 | session | seed x | count 12 | - | fp e03f51e5",
      "2026-08-13 | session | seed 9 | count 12 | - | fp short",
      formatRecord(record),
    ].join("\n");
    expect(parseSessions(text)).toHaveLength(1);
  });

  test("the recorded invocation reproduces the set", () => {
    expect(invocationOf(record)).toBe(
      "bun run session --seed 813 --count 12 --tier 1,2 --date 2026-08-13",
    );
    expect(
      invocationOf({ ...record, command: "drill", scope: "standard 7.NS.A.1" }),
    ).toBe(
      "bun run drill --seed 813 --count 12 --standard 7.NS.A.1 --date 2026-08-13",
    );
    expect(invocationOf({ ...record, scope: "-" })).toBe(
      "bun run session --seed 813 --count 12 --date 2026-08-13",
    );
  });
});

describe("fingerprint", () => {
  const setOf = (seed: number, count: number) =>
    assemble({ seed, date: "2026-08-13", count }).session.items;

  test("is stable for the same set", () => {
    expect(fingerprint(setOf(813, 12))).toBe(fingerprint(setOf(813, 12)));
  });

  test("differs when the set differs", () => {
    // This is the whole point: --count changes the items, so a seed alone
    // does not identify a set and the index has to record the invocation.
    expect(fingerprint(setOf(813, 12))).not.toBe(fingerprint(setOf(813, 13)));
    expect(fingerprint(setOf(813, 12))).not.toBe(fingerprint(setOf(814, 12)));
  });

  test("catches a generator change that alters one item", () => {
    // Standing in for "a module changed since the sheet was printed": if the
    // regenerated set is not what she held, grade must refuse rather than
    // attach her answers to problems she never saw.
    const items = generateItems(generatorFor("7.NS.A.1"), new RNG(1), 5);
    const drifted = [...items];
    drifted[2] = generateItems(generatorFor("7.NS.A.1"), new RNG(99), 1)[0]!;
    expect(fingerprint(drifted)).not.toBe(fingerprint(items));
  });

  test("is eight hex characters", () => {
    for (const seed of [1, 42, 813, 65535]) {
      expect(fingerprint(setOf(seed, 12))).toMatch(/^[0-9a-f]{8}$/);
    }
  });
});
