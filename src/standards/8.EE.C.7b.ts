// 8.EE.C.7b -- linear equations with variables on both sides.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   form:    ax + b = cx + d,  a != c
//   require: integer solution; negative coefficients present
//   error:   sign error moving terms across
//
// Error signatures (brief.md §5): SIGN_MOVE, COLLECT_WRONG_SIDE
// Tier 3. brief.md §3's graph puts this directly below like terms, and
// directly above both inequalities and substitution.
//
// The named error has to produce an INTEGER wrong answer or it is useless as
// a distractor -- she would spot a fraction immediately. So b is drawn as a
// multiple of (a - c), which makes the sign-error result land on a whole
// number by construction.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";
import { evaluate, renderConstant, renderTerm, sidesAgree } from "../linear.ts";

const STANDARD = "8.EE.C.7b" as const;
const TIER: Tier = 3;

const DIRECTIVE = "Solve:";

function nonZero(rng: RNG, min: number, max: number): number {
  for (;;) {
    const n = rng.int(min, max);
    if (n !== 0) return n;
  }
}

function generate(rng: RNG): Item {
  // gap = a - c, never 0, so the equation is never degenerate.
  const gap = nonZero(rng, -5, 5);
  // b is a multiple of the gap; see the note above.
  const multiple = nonZero(rng, -4, 4);
  const b = gap * multiple;

  // Bias c negative -- the item spec wants negative coefficients present.
  // c and gap are each non-zero, but their SUM is a, and a === 0 prints a
  // literal `0x` term: "0x - 3 = x - 7" is not variables-on-both-sides.
  const drawC = () => (rng.bool(0.6) ? rng.int(-6, -1) : rng.int(1, 6));
  let c = drawC();
  while (c + gap === 0) c = drawC();
  const a = c + gap;
  const solution = rng.int(-9, 9);
  const d = gap * solution + b;

  const left = renderTerm(a, "x") + renderConstant(b);
  const right = renderTerm(c, "x") + renderConstant(d);

  const work = [
    `Get the x terms on one side. Subtract ${renderTerm(c, "x")} from both sides:`,
    `  ${renderTerm(gap, "x")}${renderConstant(b)} = ${d}`,
    `Now move the constant. Subtract ${b} from both sides:`,
    `  ${renderTerm(gap, "x")} = ${d - b}`,
    `Divide both sides by ${gap}:`,
    `  x = ${solution}`,
    `Check both sides with x = ${solution}:`,
    `  ${a}(${solution})${renderConstant(b)} = ${a * solution + b}`,
    `  ${c}(${solution})${renderConstant(d)} = ${c * solution + d}`,
  ];

  // The named error: b moved across without changing sign.
  const wrong = solution + 2 * multiple;

  return {
    standard: STANDARD,
    prompt: `${DIRECTIVE}  ${left} = ${right}`,
    solution: `x = ${solution}`,
    work,
    trap: trap(
      `x = ${wrong}`,
      `moved ${b} across without changing its sign. Subtracting ${b} from both sides gives ${d - b} on the right, not ${d + b}`,
    ),
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- substitute the claimed x into both sides
// ---------------------------------------------------------------------------

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;
  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;

  const equation = item.prompt.slice(DIRECTIVE.length).trim();
  const sides = equation.split("=");
  if (sides.length !== 2) return false;

  const claimed = /^x = (-?\d+)$/.exec(item.solution);
  if (!claimed) return false;
  const x = Number(claimed[1]);

  // The stated solution must actually balance the equation.
  if (!sidesAgree(equation, { x })) return false;

  // a != c, or the equation is degenerate. Compare the two sides' slopes.
  const slope = (side: string): number | null => {
    const at1 = evaluate(side, { x: 1 });
    const at0 = evaluate(side, { x: 0 });
    return at1 === null || at0 === null ? null : at1 - at0;
  };
  const leftSlope = slope(sides[0]!);
  const rightSlope = slope(sides[1]!);
  if (leftSlope === null || rightSlope === null) return false;
  if (leftSlope === rightSlope) return false;
  // Both sides need a REAL x term. A zero coefficient still prints an `x`
  // ("0x - 3 = x - 7"), so an includes("x") check passes it -- this does not.
  if (leftSlope === 0 || rightSlope === 0) return false;

  // Item spec: negative coefficients present.
  if (!/-/.test(equation)) return false;

  // Variables must genuinely appear on both sides.
  if (!sides[0]!.includes("x") || !sides[1]!.includes("x")) return false;

  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  const wrongValue = /^x = (-?\d+)$/.exec(wrong);
  if (!wrongValue) return false;
  if (Number(wrongValue[1]) === x) return false;
  // A distractor that also solves the equation would not be wrong.
  if (sidesAgree(equation, { x: Number(wrongValue[1]) })) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
