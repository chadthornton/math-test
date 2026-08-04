import { describe, expect, test } from "bun:test";

import { RNG, generateItems, type Item, type Session } from "./generate.ts";
import { renderKey, renderSet } from "./render.ts";
import signedArithmetic from "./standards/7.NS.A.1.ts";

const sample = (count: number, seed = 42) =>
  generateItems(signedArithmetic, new RNG(seed), count);

describe("RNG", () => {
  test("same seed produces the same stream", () => {
    const a = Array.from({ length: 20 }, () => new RNG(7).int(2, 20));
    const b = new RNG(7);
    expect(a[0]).toBe(b.int(2, 20));

    const one = new RNG(99);
    const two = new RNG(99);
    const drawsOne = Array.from({ length: 50 }, () => one.float());
    const drawsTwo = Array.from({ length: 50 }, () => two.float());
    expect(drawsOne).toEqual(drawsTwo);
  });

  test("different seeds diverge", () => {
    const one = Array.from({ length: 50 }, (_, i) => new RNG(i).int(0, 1e6));
    expect(new Set(one).size).toBeGreaterThan(40);
  });

  test("int() stays in range and covers both ends", () => {
    const rng = new RNG(1);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const n = rng.int(2, 20);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(20);
      seen.add(n);
    }
    expect(seen.size).toBe(19);
  });

  test("fork() is reproducible", () => {
    expect(new RNG(5).fork()).toBe(new RNG(5).fork());
  });
});

describe("7.NS.A.1", () => {
  test("every shipped item passes its own verifier", () => {
    for (const item of sample(2000)) {
      expect(signedArithmetic.verify(item)).toBe(true);
    }
  });

  test("brief §5 constraints hold: range, negative operand, integer answer", () => {
    for (const item of sample(1000, 11)) {
      const expression = item.prompt.replace("Evaluate:  ", "");
      const operands = [...expression.matchAll(/-?\d+/g)].map((m) => Number(m[0]));
      expect(operands.length).toBeGreaterThanOrEqual(2);
      expect(operands.length).toBeLessThanOrEqual(3);
      for (const n of operands) {
        expect(Math.abs(n)).toBeGreaterThanOrEqual(2);
        expect(Math.abs(n)).toBeLessThanOrEqual(20);
      }
      expect(operands.some((n) => n < 0)).toBe(true);
      expect(Number.isInteger(Number(item.solution))).toBe(true);
    }
  });

  test("the distractor is never the right answer", () => {
    for (const item of sample(1000, 3)) {
      const trapValue = Number(/^`(-?\d+)`/.exec(item.trap)![1]);
      expect(trapValue).not.toBe(Number(item.solution));
    }
  });

  test("the double-negative trap form is generated", () => {
    const doubles = sample(300, 21).filter((i) => i.prompt.includes("- (-"));
    expect(doubles.length).toBeGreaterThan(30);
    for (const item of doubles) {
      expect(item.work[0]).toContain("Subtracting a negative is adding");
    }
  });

  test("verifier rejects a tampered solution", () => {
    const item = sample(1)[0]!;
    const wrong = { ...item, solution: String(Number(item.solution) + 1) };
    expect(signedArithmetic.verify(wrong)).toBe(false);
  });

  test("verifier recomputes from the printed problem, not the stored answer", () => {
    const handBuilt = (solution: string): Item => ({
      standard: "7.NS.A.1",
      tier: 1,
      seed: 0,
      prompt: "Evaluate:  8 + (-15)",
      solution,
      work: ["8 + (-15)  =  8 - 15"],
      trap: "`23` -- added the magnitudes",
    });
    expect(signedArithmetic.verify(handBuilt("-7"))).toBe(true);
    expect(signedArithmetic.verify(handBuilt("23"))).toBe(false);
    expect(signedArithmetic.verify(handBuilt("7"))).toBe(false);
  });

  test("verifier rejects an out-of-range or all-positive expression", () => {
    const base = sample(1, 8)[0]!;
    expect(
      signedArithmetic.verify({ ...base, prompt: "Evaluate:  40 + (-15)", solution: "25" }),
    ).toBe(false); // 40 exceeds the [2, 20] range
    expect(
      signedArithmetic.verify({ ...base, prompt: "Evaluate:  8 + 15", solution: "23" }),
    ).toBe(false); // no negative operand
  });

  test("verifier rejects a distractor equal to the answer", () => {
    const item = sample(1, 4)[0]!;
    const wrong = { ...item, trap: `\`${item.solution}\` -- nonsense` };
    expect(signedArithmetic.verify(wrong)).toBe(false);
  });

  test("verifier rejects non-ASCII", () => {
    const item = sample(1, 6)[0]!;
    const wrong = { ...item, prompt: item.prompt.replace("-", "−") };
    expect(signedArithmetic.verify(wrong)).toBe(false);
  });
});

describe("render", () => {
  const session = (seed: number): Session => ({
    seed,
    date: "2026-08-04",
    items: sample(10, seed),
  });

  test("same seed renders byte-identical markdown", () => {
    expect(renderSet(session(42))).toBe(renderSet(session(42)));
    expect(renderKey(session(42))).toBe(renderKey(session(42)));
  });

  test("the student sheet does not name the standard (brief §4)", () => {
    expect(renderSet(session(42))).not.toContain("7.NS.A.1");
    expect(renderKey(session(42))).toContain("7.NS.A.1");
  });

  test("the key prints the computed answer for every item", () => {
    const s = session(13);
    const key = renderKey(s);
    for (const item of s.items) {
      expect(key).toContain(`ANSWER:  ${item.solution}`);
    }
  });

  test("output is ASCII and fences are balanced", () => {
    for (const text of [renderSet(session(5)), renderKey(session(5))]) {
      expect(/^[\x20-\x7e\n]*$/.test(text)).toBe(true);
      expect((text.match(/^```$/gm) ?? []).length % 2).toBe(0);
    }
  });
});
