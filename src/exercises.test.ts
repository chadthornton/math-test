import { describe, expect, test } from "bun:test";

import { RNG, generateItems, type Item } from "./generate.ts";
import { BUILT, generatorFor } from "./registry.ts";
import { REMINDERS, rankTraps } from "./reminders.ts";
import { ALL_SIGNATURES, SIGNATURES } from "./signatures.ts";
import {
  buildSweep,
  renderFaded,
  renderFadedKey,
  renderReminder,
  renderSweep,
  renderSweepKey,
} from "./exercises.ts";

const sheetFor = (standard: string, seed = 3) => {
  const rng = new RNG(seed);
  const gen = generatorFor(standard);
  const ladder = generateItems(gen, rng, 4);
  const decoys = BUILT.filter((s) => s !== standard)
    .slice(0, 5)
    .map((s) => generateItems(generatorFor(s), rng, 1)[0]!);
  const mixed = [generateItems(gen, rng, 1)[0]!, ...decoys];
  return { standard: standard as never, ladder, mixed, date: "2026-08-13", seed };
};

// ---------------------------------------------------------------------------
// Faded example -- brief.md §6
// ---------------------------------------------------------------------------

describe("faded example", () => {
  test.each(BUILT)("%s: the fade actually fades", (standard) => {
    const sheet = sheetFor(standard);
    const sheetText = renderFaded(sheet);

    const level = (n: number) =>
      sheetText.split(`## Level ${n}`)[1]!.split("## Level")[0]!;

    // Level 1 is fully worked; level 4 is the bare problem.
    expect(level(1)).toContain(sheet.ladder[0]!.solution);
    expect(level(4)).not.toContain(sheet.ladder[3]!.solution);
    // Blanks increase down the ladder.
    const blanks = (t: string) => (t.match(/_{10,}/g) ?? []).length;
    expect(blanks(level(1))).toBe(0);
    expect(blanks(level(3))).toBeGreaterThan(blanks(level(2)));
  });

  test.each(BUILT)("%s: level 2 does not give the answer away", (standard) => {
    const sheet = sheetFor(standard);
    const level2 = renderFaded(sheet).split("## Level 2")[1]!.split("## Level 3")[0]!;
    // The answer line is always blank.
    expect(level2).toMatch(/ANSWER:\s+_{6,}/);
    // And the worked part must not state the answer. Skipped where the
    // solution is a substring of its own problem -- sqrt(25) answers "5" and
    // "25" contains "5", so containment says nothing there.
    const item = sheet.ladder[1]!;
    if (item.solution.length >= 2 && !item.prompt.includes(item.solution)) {
      // The bug the preview caught: 7.EE.B.4 stated `x < -8` and blanked only
      // the graph line beneath it.
      expect(level2).not.toContain(item.solution);
    }
  });

  test.each(BUILT)("%s: level 3 keeps the reasoning, drops the algebra", (standard) => {
    const sheet = sheetFor(standard);
    const level3 = renderFaded(sheet).split("## Level 3")[1]!.split("## Level 4")[0]!;
    const item = sheet.ladder[2]!;
    expect(level3).toMatch(/ANSWER:\s+_{6,}/);
    expect(level3).toContain(item.work[0]!);
    if (item.solution.length >= 2 && !item.prompt.includes(item.solution)) {
      expect(level3).not.toContain(item.solution);
    }
  });

  test("level 5 hides exactly one item of the practised type", () => {
    const sheet = sheetFor("7.EE.B.4");
    const matching = sheet.mixed.filter((i) => i.standard === "7.EE.B.4");
    expect(matching).toHaveLength(1);
    // And the student sheet must not say which one.
    expect(renderFaded(sheet)).not.toContain("7.EE.B.4");
    expect(renderFadedKey(sheet)).toContain("7.EE.B.4");
  });

  test("the ladder is all one type, with different numbers", () => {
    const sheet = sheetFor("8.EE.C.7b");
    expect(new Set(sheet.ladder.map((i) => i.standard)).size).toBe(1);
    expect(new Set(sheet.ladder.map((i) => i.prompt)).size).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Reminder sheet -- brief.md §5
// ---------------------------------------------------------------------------

describe("reminder sheet", () => {
  test("every built standard has one authored", () => {
    for (const standard of BUILT) expect(REMINDERS[standard]).toBeDefined();
  });

  test("every authored trap tag is in brief §5's taxonomy", () => {
    // The prose is unverifiable; the tags are not. A typo here would break
    // the log-driven re-ranking silently.
    for (const [standard, reminder] of Object.entries(REMINDERS)) {
      for (const trap of reminder!.traps) {
        expect(ALL_SIGNATURES.has(trap.signature)).toBe(true);
        expect(SIGNATURES[standard as keyof typeof SIGNATURES]).toContain(
          trap.signature,
        );
      }
    }
  });

  test("the structure brief §5 fixes is present", () => {
    const example = generateItems(generatorFor("7.EE.B.4"), new RNG(1), 1)[0]!;
    const sheet = renderReminder("7.EE.B.4", example);
    for (const section of ["## RULE", "## SEQUENCE", "## EXAMPLE", "## TRAPS"]) {
      expect(sheet).toContain(section);
    }
    // The example is generated and verified, not authored.
    expect(sheet).toContain(example.solution);
  });

  test("rule bullets stay at 1-3, as brief §5 specifies", () => {
    for (const reminder of Object.values(REMINDERS)) {
      expect(reminder!.rule.length).toBeGreaterThanOrEqual(1);
      expect(reminder!.rule.length).toBeLessThanOrEqual(4);
      expect(reminder!.sequence.length).toBeGreaterThan(1);
    }
  });

  test("traps she has hit are promoted and marked, not rewritten", () => {
    const reminder = REMINDERS["7.EE.B.4"]!;
    const hit = new Set(["WRONG_DOT"]);
    const ranked = rankTraps(reminder.traps, hit);
    expect(ranked[0]!.signature).toBe("WRONG_DOT");
    // Re-rank, do not rewrite: same set of traps, same text.
    expect(new Set(ranked.map((t) => t.text))).toEqual(
      new Set(reminder.traps.map((t) => t.text)),
    );

    const example = generateItems(generatorFor("7.EE.B.4"), new RNG(1), 1)[0]!;
    const sheet = renderReminder("7.EE.B.4", example, hit);
    expect(sheet).toContain(">> WRONG_DOT <<");
  });
});

// ---------------------------------------------------------------------------
// Diagnostic sweep -- brief.md §4
// ---------------------------------------------------------------------------

describe("diagnostic sweep", () => {
  const pool = (): Item[] => {
    const rng = new RNG(4);
    const out: Item[] = [];
    for (const s of BUILT) out.push(...generateItems(generatorFor(s), rng, 4));
    return out;
  };

  test("every question is a real choice", () => {
    const questions = buildSweep(pool(), new RNG(4));
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.trapIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).not.toBe(q.trapIndex);
      expect(q.options[q.correctIndex]).toBe(q.item.solution);
    }
  });

  test("the correct answer is not always in the same place", () => {
    const questions = buildSweep(pool(), new RNG(4));
    expect(new Set(questions.map((q) => q.correctIndex)).size).toBeGreaterThan(1);
  });

  test("the student sheet hides the standard; the key names it", () => {
    const questions = buildSweep(pool(), new RNG(4)).slice(0, 6);
    const sheet = renderSweep(questions, "2026-08-13", 4);
    const key = renderSweepKey(questions, "2026-08-13", 4);
    for (const standard of BUILT) expect(sheet).not.toContain(standard);
    expect(key).toContain(questions[0]!.item.standard);
  });

  test("the key marks which wrong answer is diagnostic", () => {
    const questions = buildSweep(pool(), new RNG(4)).slice(0, 3);
    const key = renderSweepKey(questions, "2026-08-13", 4);
    expect(key).toContain("diagnostic wrong answer");
    // And carries the paste-ready log line, so a sweep feeds log.md too.
    expect((key.match(/^log: /gm) ?? []).length).toBe(3);
  });
});
