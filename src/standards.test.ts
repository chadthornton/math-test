import { describe, expect, test } from "bun:test";

import { RNG, generateItems, trapAnswer, type Generator } from "./generate.ts";
import { evaluate } from "./linear.ts";
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

  test("never generates a times-table fact", () => {
    // The drilling app owns 1-10; this module owns the multi-digit algorithm.
    // Compare DIGIT strings, not values: 0.24 x 0.5 is 24 x 5 underneath, and
    // 24 x 5 is a written computation, not a recalled fact.
    for (const item of sample(gen, 800, 12)) {
      const digits = item.prompt
        .replace("Multiply:  ", "")
        .split(" x ")
        .map((f) => Number(f.replace(".", "")));
      expect(Math.max(...digits)).toBeGreaterThanOrEqual(12);
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
// 8.EE.A.2 -- the half the spec left out
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
    // 2^2 x 18 === 72, so the specified check alone would pass this.
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

// ---------------------------------------------------------------------------
// batch-level constraints: "negative ... in >= half of items"
// ---------------------------------------------------------------------------

describe("balance constraints", () => {
  test.each(["7.EE.A.1", "7.EE.B.4"] as const)(
    "%s has negatives in at least half of every batch",
    (name) => {
      const gen = REGISTRY[name]!;
      expect(gen.balance).toBeDefined();
      for (const seed of [1, 2, 3, 7, 42, 99]) {
        for (const count of [4, 6, 8, 13]) {
          const items = generateItems(gen, new RNG(seed), count);
          const holding = items.filter((i) => gen.balance!.holds(i)).length;
          expect(holding).toBeGreaterThanOrEqual(Math.ceil(count / 2));
        }
      }
    },
  );

  test("balancing does not sort the batch", () => {
    const gen = REGISTRY["7.EE.B.4"]!;
    const flags = generateItems(gen, new RNG(4), 12).map((i) =>
      gen.balance!.holds(i),
    );
    expect(flags).not.toEqual([...flags].sort());
  });
});

// ---------------------------------------------------------------------------
// 7.EE.A.1 -- like terms
// ---------------------------------------------------------------------------

describe("7.EE.A.1", () => {
  const gen = REGISTRY["7.EE.A.1"]!;
  const item = (prompt: string, solution: string, trap: string) => ({
    standard: "7.EE.A.1" as const,
    tier: 3 as const,
    seed: 7,
    prompt,
    solution,
    work: ["step"],
    trap,
  });

  test("catches distributing to the first term only", () => {
    // 7x - 2(3x - 5) + 4  =  x + 14. Dropping the second distribute gives x - 1.
    expect(
      gen.verify(item("Simplify:  7x - 2(3x - 5) + 4", "x + 14", "`x - 1` -- y")),
    ).toBe(true);
    expect(
      gen.verify(item("Simplify:  7x - 2(3x - 5) + 4", "x - 1", "`x + 14` -- y")),
    ).toBe(false);
  });

  test("an unsimplified answer is rejected even though it evaluates equal", () => {
    // Identical expression: equal at every x, but not simplified.
    expect(
      gen.verify(
        item(
          "Simplify:  7x - 2(3x - 5) + 4",
          "7x - 2(3x - 5) + 4",
          "`x + 14` -- y",
        ),
      ),
    ).toBe(false);
  });

  test("the simplified form matches the original at many x", () => {
    for (const it of sample(gen, 150, 19)) {
      const question = it.prompt.replace("Simplify:  ", "");
      for (let x = -20; x <= 20; x += 7) {
        expect(evaluate(question, { x })).toBe(evaluate(it.solution, { x })!);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7.EE.B.4 -- inequalities
// ---------------------------------------------------------------------------

describe("7.EE.B.4", () => {
  const gen = REGISTRY["7.EE.B.4"]!;
  const item = (prompt: string, solution: string, trap: string) => ({
    standard: "7.EE.B.4" as const,
    tier: 3 as const,
    seed: 7,
    prompt,
    solution,
    work: ["step"],
    trap,
  });
  const ask = "Solve, then describe the graph:  ";

  test("catches a missing flip on a negative coefficient", () => {
    // -3x + 2 > 11  ->  -3x > 9  ->  x < -3, sign flipped.
    expect(
      gen.verify(
        item(
          `${ask}-3x + 2 > 11`,
          "x < -3 (open dot at -3, arrow left)",
          "`x > -3 (open dot at -3, arrow right)` -- y",
        ),
      ),
    ).toBe(true);
    expect(
      gen.verify(
        item(
          `${ask}-3x + 2 > 11`,
          "x > -3 (open dot at -3, arrow right)",
          "`x < -3 (open dot at -3, arrow left)` -- y",
        ),
      ),
    ).toBe(false);
  });

  test("catches a wrong dot fill", () => {
    expect(
      gen.verify(
        item(
          `${ask}2x + 1 >= 9`,
          "x >= 4 (closed dot at 4, arrow right)",
          "`x <= 4 (closed dot at 4, arrow left)` -- y",
        ),
      ),
    ).toBe(true);
    expect(
      gen.verify(
        item(
          `${ask}2x + 1 >= 9`,
          "x >= 4 (open dot at 4, arrow right)",
          "`x <= 4 (closed dot at 4, arrow left)` -- y",
        ),
      ),
    ).toBe(false);
  });

  test("catches a wrong arrow direction", () => {
    expect(
      gen.verify(
        item(
          `${ask}2x + 1 >= 9`,
          "x >= 4 (closed dot at 4, arrow left)",
          "`x <= 4 (closed dot at 4, arrow right)` -- y",
        ),
      ),
    ).toBe(false);
  });

  test("the boundary sits on the equality and the sides really differ", () => {
    for (const it of sample(gen, 200, 23)) {
      const m = /:\s+(-?\d*)x\s*([+-])\s*(\d+)\s*(<=|>=|<|>)\s*(-?\d+)$/.exec(
        it.prompt,
      )!;
      const a = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
      const b = (m[2] === "-" ? -1 : 1) * Number(m[3]);
      const c = Number(m[5]);
      const k = Number(/x [<>]=? (-?\d+)/.exec(it.solution)![1]);
      expect(a * k + b).toBe(c);
    }
  });
});

// ---------------------------------------------------------------------------
// 8.EE.C.7b -- variables on both sides
// ---------------------------------------------------------------------------

describe("8.EE.C.7b", () => {
  const gen = REGISTRY["8.EE.C.7b"]!;

  test("the claimed x balances both sides", () => {
    for (const it of sample(gen, 300, 29)) {
      const [left, right] = it.prompt.replace("Solve:  ", "").split("=");
      const x = Number(/x = (-?\d+)/.exec(it.solution)![1]);
      expect(evaluate(left!, { x })).toBe(evaluate(right!, { x })!);
    }
  });

  test("the distractor never also solves the equation", () => {
    for (const it of sample(gen, 300, 31)) {
      const [left, right] = it.prompt.replace("Solve:  ", "").split("=");
      const wrong = Number(/x = (-?\d+)/.exec(trapAnswer(it.trap)!)![1]);
      expect(evaluate(left!, { x: wrong })).not.toBe(evaluate(right!, { x: wrong })!);
    }
  });

  test("no item ever prints a zero coefficient", () => {
    // `0x - 3 = x - 7` is not variables-on-both-sides, and it used to verify:
    // "0x".includes("x") is true, so the old check waved it through.
    for (const it of sample(gen, 3000, 1)) {
      expect(it.prompt).not.toMatch(/(^|[^\d])0x/);
    }
  });

  test("a zero coefficient is rejected even though it balances", () => {
    const zeroed = {
      standard: "8.EE.C.7b" as const,
      tier: 3 as const,
      seed: 1,
      prompt: "Solve:  0x - 3 = x - 7",
      solution: "x = 4",
      work: ["s"],
      trap: "`x = 9` -- y",
    };
    // It does balance -- 0(4) - 3 === 4 - 7 -- so only the slope check catches it.
    expect(evaluate("0x - 3", { x: 4 })).toBe(evaluate("x - 7", { x: 4 })!);
    expect(gen.verify(zeroed)).toBe(false);
  });

  test("both sides carry a variable and a degenerate equation is rejected", () => {
    const base = {
      standard: "8.EE.C.7b" as const,
      tier: 3 as const,
      seed: 1,
      work: ["s"],
      trap: "`x = 9` -- y",
    };
    // a === c: no unique solution.
    expect(
      gen.verify({ ...base, prompt: "Solve:  2x - 3 = 2x - 3", solution: "x = 4" }),
    ).toBe(false);
    // No variable on the right.
    expect(
      gen.verify({ ...base, prompt: "Solve:  2x - 3 = 5", solution: "x = 4" }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8.EE.C.8b -- substitution, NOT equal-values (brief §7)
// ---------------------------------------------------------------------------

describe("8.EE.C.8b", () => {
  const gen = REGISTRY["8.EE.C.8b"]!;
  const ask = "Solve the system by SUBSTITUTION. Give both x and y.";
  const item = (a: string, b: string, solution: string) => ({
    standard: "8.EE.C.8b" as const,
    tier: 4 as const,
    seed: 1,
    prompt: `${ask}\n\n  ${a}\n  ${b}`,
    solution,
    work: ["s"],
    trap: "`x = 99` -- y",
  });

  test("an equal-values pair is rejected -- brief §7's correction", () => {
    // Both solved for y: this is the method the practice test wrongly teaches.
    expect(gen.verify(item("y = 2x - 3", "y = -x + 3", "x = 2, y = 1"))).toBe(false);
    // One solved, one in standard form: substitution is the only path.
    expect(gen.verify(item("y = 2x - 3", "4x + 3y = 11", "x = 2, y = 1"))).toBe(true);
  });

  test("exactly one equation is solved for a variable, in every item", () => {
    for (const it of sample(gen, 300, 37)) {
      const equations = it.prompt
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.includes("=") && !l.startsWith("Solve"));
      expect(equations).toHaveLength(2);
      expect(equations.filter((e) => /^[xy] = [^=]+$/.test(e))).toHaveLength(1);
    }
  });

  test("the solution satisfies BOTH equations", () => {
    for (const it of sample(gen, 300, 41)) {
      const m = /^x = (-?\d+), y = (-?\d+)$/.exec(it.solution)!;
      const vars = { x: Number(m[1]), y: Number(m[2]) };
      const equations = it.prompt
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.includes("=") && !l.startsWith("Solve"));
      for (const equation of equations) {
        const [left, right] = equation.split("=");
        expect(evaluate(left!, vars)).toBe(evaluate(right!, vars)!);
      }
    }
  });

  test("a wrong pair is rejected", () => {
    expect(gen.verify(item("y = 2x - 3", "4x + 3y = 11", "x = 2, y = 2"))).toBe(false);
    expect(gen.verify(item("y = 2x - 3", "4x + 3y = 11", "x = 3, y = 1"))).toBe(false);
  });

  test("parallel lines have no unique solution and are rejected", () => {
    expect(gen.verify(item("y = 2x - 3", "4x - 2y = 6", "x = 2, y = 1"))).toBe(false);
  });

  test("the parentheses error appears as a distractor, not only the stop-early one", () => {
    const parens = sample(gen, 300, 43).filter((i) =>
      i.trap.includes("dropped the parentheses"),
    );
    expect(parens.length).toBeGreaterThan(30);
  });
});

// ---------------------------------------------------------------------------
// 8.F.B.4 -- linear word problems
// ---------------------------------------------------------------------------

describe("8.F.B.4", () => {
  const gen = REGISTRY["8.F.B.4"]!;

  test("the solution satisfies the model equation", () => {
    for (const it of sample(gen, 300, 47)) {
      const m = /^Equation: (.+)\n([a-z]) = (-?\d+)\n/.exec(it.solution)!;
      const [left, right] = m[1]!.split("=");
      const vars = { [m[2]!]: Number(m[3]) };
      expect(evaluate(left!, vars)).toBe(evaluate(right!, vars)!);
    }
  });

  test("every number in the model appears in the story", () => {
    for (const it of sample(gen, 300, 53)) {
      const story = new Set((it.prompt.match(/\d+/g) ?? []).map(Number));
      const equation = /^Equation: (.+)$/m.exec(it.solution)![1]!;
      for (const n of equation.match(/\d+/g) ?? []) {
        expect(story.has(Number(n))).toBe(true);
      }
    }
  });

  test("the answer sentence carries a unit", () => {
    for (const it of sample(gen, 200, 59)) {
      const sentence = /Sentence: (.+)$/.exec(it.solution)![1]!;
      expect(sentence).toMatch(/\b(months|weeks|miles|minutes)\b/);
    }
  });

  test("a sentence without units is rejected", () => {
    const it = sample(gen, 1, 61)[0]!;
    const stripped = it.solution.replace(
      /Sentence: .+$/,
      "Sentence: It takes 4.",
    );
    expect(gen.verify({ ...it, solution: stripped })).toBe(false);
  });

  test("both named errors appear as distractors", () => {
    const items = sample(gen, 300, 67);
    expect(items.filter((i) => i.trap.includes("wrong slot")).length).toBeGreaterThan(30);
    expect(items.filter((i) => i.trap.includes("stopped at the number")).length).toBeGreaterThan(30);
  });

  test("a decreasing story produces a negative rate", () => {
    const draining = sample(gen, 300, 71).filter((i) => i.prompt.includes("drains"));
    expect(draining.length).toBeGreaterThan(20);
    for (const it of draining) {
      expect(it.solution).toMatch(/Equation: -\d+/);
    }
  });
});
