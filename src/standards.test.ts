import { describe, expect, test } from "bun:test";

import { RNG, generateItems, trapAnswer, type Generator } from "./generate.ts";
import { BUILT, REGISTRY } from "./registry.ts";

const sample = (gen: Generator, count: number, seed = 42) =>
  generateItems(gen, new RNG(seed), count);

// ---------------------------------------------------------------------------
// contract every standard module must honour
// ---------------------------------------------------------------------------

describe.each(BUILT)("%s", (name) => {
  const gen = REGISTRY[name]!;

  test("every shipped item passes its own verifier", () => {
    for (const item of sample(gen, 600)) {
      expect(gen.verify(item)).toBe(true);
    }
  });

  test("items are printable, labelled, and carry work plus a distractor", () => {
    for (const item of sample(gen, 200, 5)) {
      expect(item.standard).toBe(name);
      expect(item.tier).toBe(gen.tier);
      expect(item.solution.length).toBeGreaterThan(0);
      expect(item.work.length).toBeGreaterThan(0);
      expect(trapAnswer(item.trap)).not.toBeNull();
      expect(trapAnswer(item.trap)).not.toBe(item.solution);
      expect(/^[\x20-\x7e\n]*$/.test(item.prompt)).toBe(true);
    }
  });

  test("a seed reproduces the same items", () => {
    const a = sample(gen, 25, 99).map((i) => `${i.prompt}=${i.solution}`);
    const b = sample(gen, 25, 99).map((i) => `${i.prompt}=${i.solution}`);
    expect(a).toEqual(b);
  });

  test("Item.seed regenerates that item on its own", () => {
    for (const item of sample(gen, 20, 77)) {
      expect(gen.generate(new RNG(item.seed))).toEqual(item);
    }
  });

  test("a corrupted solution is rejected", () => {
    let caught = 0;
    for (const item of sample(gen, 40, 12)) {
      const wrong = trapAnswer(item.trap)!;
      if (!gen.verify({ ...item, solution: wrong })) caught++;
    }
    expect(caught).toBe(40); // the distractor must never verify as the answer
  });
});

// ---------------------------------------------------------------------------
// 5.NBT.B.5 -- decimals must be exact
// ---------------------------------------------------------------------------

describe("5.NBT.B.5", () => {
  const gen = REGISTRY["5.NBT.B.5"]!;

  test("decimal answers are exact, not float noise", () => {
    const decimals = sample(gen, 500, 31).filter((i) => i.prompt.includes("."));
    expect(decimals.length).toBeGreaterThan(50);
    for (const item of decimals) {
      // At most three places, and no 0.30000000000000004 tails.
      expect(item.solution).toMatch(/^\d+(\.\d{1,3})?$/);
    }
  });

  test("beats naive float multiplication on at least one case", () => {
    const decimals = sample(gen, 500, 31).filter((i) => i.prompt.includes("."));
    let floatWouldBeWrong = 0;
    for (const item of decimals) {
      const [a, b] = item.prompt.replace("Multiply:", "").trim().split(" x ");
      const naive = String(Number(a) * Number(b));
      if (naive !== item.solution) floatWouldBeWrong++;
    }
    expect(floatWouldBeWrong).toBeGreaterThan(0);
  });

  test("factors never print a redundant trailing zero", () => {
    for (const item of sample(gen, 400, 8)) {
      expect(item.prompt).not.toMatch(/\d\.\d*0(\s|$)/);
    }
  });

  test("all three forms appear", () => {
    const items = sample(gen, 300, 2);
    expect(items.some((i) => /  \d{2} x \d$/.test(i.prompt))).toBe(true);
    expect(items.some((i) => /  \d{2} x \d{2}$/.test(i.prompt))).toBe(true);
    expect(items.some((i) => i.prompt.includes("."))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8.EE.A.1 -- numeric substitution is the check
// ---------------------------------------------------------------------------

describe("8.EE.A.1", () => {
  const gen = REGISTRY["8.EE.A.1"]!;
  const item = (prompt: string, solution: string, trap: string) => ({
    standard: "8.EE.A.1" as const,
    tier: 2 as const,
    seed: 0,
    prompt,
    solution,
    work: ["step"],
    trap,
  });

  test("catches the named error: multiplying exponents on a product", () => {
    expect(
      gen.verify(item("Simplify:  x^3 * x^5", "x^15", "`x^8` -- y")),
    ).toBe(false);
    expect(
      gen.verify(item("Simplify:  x^3 * x^5", "x^8", "`x^15` -- y")),
    ).toBe(true);
  });

  test("catches adding exponents on a power of a power", () => {
    expect(gen.verify(item("Simplify:  (x^3)^4", "x^7", "`x^12` -- y"))).toBe(false);
    expect(gen.verify(item("Simplify:  (x^3)^4", "x^12", "`x^7` -- y"))).toBe(true);
  });

  test("a negative exponent is a reciprocal, not a negative value", () => {
    expect(gen.verify(item("Simplify:  x^(-4)", "-x^4", "`1/x^4` -- y"))).toBe(false);
    expect(gen.verify(item("Simplify:  x^(-4)", "1/x^4", "`-x^4` -- y"))).toBe(true);
  });

  test("x^0 is 1, not 0", () => {
    expect(gen.verify(item("Simplify:  x^0", "0", "`1` -- y"))).toBe(false);
    expect(gen.verify(item("Simplify:  x^0", "1", "`0` -- y"))).toBe(true);
  });

  test("all five forms appear", () => {
    const prompts = sample(gen, 300, 4).map((i) => i.prompt);
    expect(prompts.some((p) => p.includes("*"))).toBe(true);
    expect(prompts.some((p) => p.includes("/"))).toBe(true);
    expect(prompts.some((p) => /\(\w\^\d\)\^\d/.test(p))).toBe(true);
    expect(prompts.some((p) => p.endsWith("^0"))).toBe(true);
    expect(prompts.some((p) => p.includes("^(-"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8.EE.A.2 -- the half spec.md leaves out
// ---------------------------------------------------------------------------

describe("8.EE.A.2", () => {
  const gen = REGISTRY["8.EE.A.2"]!;
  const item = (solution: string, trap: string) => ({
    standard: "8.EE.A.2" as const,
    tier: 2 as const,
    seed: 0,
    prompt: "Simplify:  sqrt(72)",
    solution,
    work: ["step"],
    trap,
  });

  test("a non-maximal extraction is rejected even though coeff^2 x radicand matches", () => {
    // 2^2 x 18 === 72, so spec.md's stated check alone would pass this.
    expect(2 ** 2 * 18).toBe(72);
    expect(gen.verify(item("2 sqrt(18)", "`6 sqrt(2)` -- y"))).toBe(false);
    expect(gen.verify(item("3 sqrt(8)", "`6 sqrt(2)` -- y"))).toBe(false);
    expect(gen.verify(item("6 sqrt(2)", "`2 sqrt(18)` -- y"))).toBe(true);
  });

  test("every simplified radicand is squarefree", () => {
    for (const item of sample(gen, 400, 6)) {
      const m = /^(?:\d+ )?sqrt\((\d+)\)$/.exec(item.solution);
      if (!m) continue;
      const radicand = Number(m[1]);
      for (let d = 2; d * d <= radicand; d++) {
        expect(radicand % (d * d)).not.toBe(0);
      }
    }
  });

  test("odd perfect squares are reachable", () => {
    const roots = sample(gen, 400, 17)
      .map((i) => /^Simplify:  sqrt\((\d+)\)$/.exec(i.prompt))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .filter((n) => Number.isInteger(Math.sqrt(n)));
    expect(roots.some((n) => n % 2 === 1)).toBe(true);
  });

  test("radicands stay within 200", () => {
    for (const item of sample(gen, 300, 21)) {
      const n = Number(/\((\d+)\)/.exec(item.prompt)![1]);
      expect(n).toBeLessThanOrEqual(200);
    }
  });
});

// ---------------------------------------------------------------------------
// 8.F.A.1 -- the named misconception
// ---------------------------------------------------------------------------

describe("8.F.A.1", () => {
  const gen = REGISTRY["8.F.A.1"]!;
  const item = (body: string, solution: string, trap: string) => ({
    standard: "8.F.A.1" as const,
    tier: 2 as const,
    seed: 0,
    prompt:
      "Is this relation a function? Say yes or no, and name the test or the\nreason you used. Then list the domain and the range.\n\n" +
      body,
    solution,
    work: ["step"],
    trap,
  });

  test("a repeated OUTPUT does not break functionhood", () => {
    const body = "  {(2, 5), (4, 9), (6, 5)}";
    expect(
      gen.verify(
        item(body, "Function: yes. Domain: {2, 4, 6}. Range: {5, 9}", "`Function: no` -- y"),
      ),
    ).toBe(true);
    // The misconception, asserted as the answer, must be rejected.
    expect(
      gen.verify(
        item(body, "Function: no. Domain: {2, 4, 6}. Range: {5, 9}", "`Function: yes` -- y"),
      ),
    ).toBe(false);
  });

  test("a repeated INPUT with different outputs does break it", () => {
    const body = "  {(2, 5), (2, 9), (6, 5)}";
    expect(
      gen.verify(
        item(body, "Function: no. Domain: {2, 6}. Range: {5, 9}", "`Function: yes` -- y"),
      ),
    ).toBe(true);
    expect(
      gen.verify(
        item(body, "Function: yes. Domain: {2, 6}. Range: {5, 9}", "`Function: no` -- y"),
      ),
    ).toBe(false);
  });

  test("domain and range must be deduplicated and sorted", () => {
    const body = "  {(6, 5), (2, 9), (4, 5)}";
    expect(
      gen.verify(
        item(body, "Function: yes. Domain: {2, 4, 6}. Range: {5, 9}", "`Function: no` -- y"),
      ),
    ).toBe(true);
    expect(
      gen.verify(
        item(body, "Function: yes. Domain: {6, 2, 4}. Range: {5, 9}", "`Function: no` -- y"),
      ),
    ).toBe(false);
    expect(
      gen.verify(
        item(body, "Function: yes. Domain: {2, 4, 6}. Range: {5, 9, 5}", "`Function: no` -- y"),
      ),
    ).toBe(false);
  });

  test("all four presentations appear", () => {
    const prompts = sample(gen, 300, 14).map((i) => i.prompt);
    expect(prompts.some((p) => /\{\(\d/.test(p))).toBe(true);
    expect(prompts.some((p) => p.includes("input "))).toBe(true);
    expect(prompts.some((p) => p.includes("plotted points"))).toBe(true);
    expect(prompts.some((p) => p.includes("Each number in"))).toBe(true);
  });

  test("the repeated-output case is actually generated, and flagged", () => {
    const flagged = sample(gen, 300, 23).filter((i) =>
      i.trap.includes("A repeated OUTPUT is fine"),
    );
    expect(flagged.length).toBeGreaterThan(10);
    for (const item of flagged) {
      expect(item.solution).toContain("Function: yes");
    }
  });

  test("prompts ask for vocabulary, not for an evaluation", () => {
    for (const item of sample(gen, 100, 33)) {
      expect(item.prompt).toContain("domain");
      expect(item.prompt).toContain("range");
      expect(item.prompt).toContain("function");
    }
  });
});
