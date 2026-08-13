// 8.EE.C.8b -- systems of equations by SUBSTITUTION.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   form:    one equation solved for a variable, one not
//            e.g.  y = 2x - 3  and  4x + 3y = 11
//   require: substitution is the intended path, NOT equal-values
//   error:   omits parentheses when substituting; solves for only one variable
//
// Error signatures (brief.md §5): NO_PARENS_SUB, ONE_VAR_ONLY, WRONG_SUB_TARGET
// Tier 4, and the first correction listed in brief.md §10: the
// existing practice test teaches the EQUAL-VALUES method (both equations in
// `y =` form, set them equal) and the teacher specified substitution.
//
// So the form is enforced rather than merely intended. Exactly one equation is
// solved for a variable and the other carries both variables on one side. The
// verifier asserts that, which is what rules equal-values out: there is no
// second `y =` to set anything equal to.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";
import { evaluate, renderConstant, renderTerm, sidesAgree } from "../linear.ts";

const STANDARD = "8.EE.C.8b" as const;
const TIER: Tier = 4;

const QUESTION = "Solve the system by SUBSTITUTION. Give both x and y.";

function nonZero(rng: RNG, min: number, max: number): number {
  for (;;) {
    const n = rng.int(min, max);
    if (n !== 0) return n;
  }
}

/** ` + 3y`, ` + y`, ` - y`, ` - 4y`. */
function signedTerm(coefficient: number, variable: string): string {
  return coefficient > 0
    ? ` + ${renderTerm(coefficient, variable)}`
    : ` - ${renderTerm(-coefficient, variable)}`;
}

function generate(rng: RNG): Item {
  // `sub` is the variable equation 1 is already solved for; `free` is the one
  // that survives the substitution.
  const sub = rng.bool() ? "y" : "x";
  const free = sub === "y" ? "x" : "y";

  // eq1:  sub = m*free + k
  const m = nonZero(rng, -4, 4);

  // eq2:  coefFree*free + coefSub*sub = r, written in x,y order.
  // Substituting eq1 leaves (coefFree + coefSub*m)*free = r - coefSub*k, so
  // that divisor must not be zero or the lines are parallel.
  const coefSub = nonZero(rng, -5, 5);
  let coefFree = nonZero(rng, -5, 5);
  while (coefFree + coefSub * m === 0) coefFree = nonZero(rng, -5, 5);
  const divisor = coefFree + coefSub * m;

  // The dropped-parentheses answer works out to free + j*(coefSub - 1) when k
  // is a multiple of the divisor -- a whole number, which is what makes it
  // usable as a distractor. Left to chance it is almost always a fraction,
  // and the standard's primary named error would never appear on a key.
  const parenTrapPossible = Math.abs(divisor) <= 6 && coefSub !== 1;
  const j = rng.pick([-1, 1]);
  const k = parenTrapPossible ? divisor * j : rng.int(-9, 9);

  const freeValue = rng.int(-6, 6);
  const subValue = m * freeValue + k;
  const known: Record<string, number> =
    sub === "y"
      ? { x: freeValue, y: subValue }
      : { x: subValue, y: freeValue };
  const x = known.x!;
  const y = known.y!;

  const constant = coefSub * k;
  const p = sub === "y" ? coefFree : coefSub; // coefficient of x
  const q = sub === "y" ? coefSub : coefFree; // coefficient of y
  const r = p * x + q * y;

  const eq1 = `${sub} = ${renderTerm(m, free)}${renderConstant(k)}`;
  const eq2 = `${renderTerm(p, "x")}${signedTerm(q, "y")} = ${r}`;

  const substituted =
    sub === "y"
      ? `${renderTerm(p, "x")}${signedTerm(q, "")}(${renderTerm(m, free)}${renderConstant(k)})`
      : `${renderTerm(p, "")}(${renderTerm(m, free)}${renderConstant(k)})${signedTerm(q, "y")}`;

  const work = [
    `Equation 1 is already solved for ${sub}. Substitute it into equation 2.`,
    `Put PARENTHESES around the whole thing you substitute:`,
    `  ${substituted} = ${r}`,
    `Distribute ${coefSub} across BOTH terms:`,
    `  ${renderTerm(divisor, free)}${renderConstant(constant)} = ${r}`,
    `  ${renderTerm(divisor, free)} = ${r - constant}`,
    `  ${free} = ${known[free]}`,
    `Substitute back into equation 1 for the other variable:`,
    `  ${sub} = ${m} x ${known[free]} ${k >= 0 ? "+" : "-"} ${Math.abs(k)} = ${known[sub]}`,
    `Check (${x}, ${y}) in BOTH equations before writing it down.`,
  ];

  // The named error: parentheses dropped, so only the first term inside gets
  // multiplied. Use it when it lands on a whole number -- a fraction is not a
  // wrong answer she would ever write down.
  const droppedParens = (r - k) / divisor;
  const distractor =
    Number.isInteger(droppedParens) && droppedParens !== known[free]
      ? trap(
          `${free} = ${droppedParens}`,
          `dropped the parentheses when substituting, so the ${k} never got multiplied by ${coefSub}. That term is ${constant}, not ${k}`,
        )
      : trap(
          `${free} = ${known[free]}`,
          `found ${free} and stopped. A system has two unknowns -- substitute back to get ${sub} too`,
        );

  return {
    standard: STANDARD,
    prompt: `${QUESTION}\n\n  ${eq1}\n  ${eq2}`,
    solution: `x = ${x}, y = ${y}`,
    work,
    trap: distractor,
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- substitute (x, y) into BOTH original equations, per spec.md
// ---------------------------------------------------------------------------

const SOLVED_FORM = /^([xy]) = [^=]+$/;

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;

  const equations = item.prompt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("=") && !line.startsWith("Solve"));
  if (equations.length !== 2) return false;

  const claimed = /^x = (-?\d+), y = (-?\d+)$/.exec(item.solution);
  if (!claimed) return false;
  const point = { x: Number(claimed[1]), y: Number(claimed[2]) };

  // spec.md: the pair must satisfy BOTH equations.
  for (const equation of equations) {
    if (!sidesAgree(equation, point)) return false;
  }

  // Exactly one equation is solved for a variable. Two would make this an
  // equal-values problem, which is the method brief.md §10 says to replace.
  const solved = equations.filter((e) => SOLVED_FORM.test(e));
  if (solved.length !== 1) return false;

  // The other equation carries both variables, on the left.
  const standard = equations.find((e) => !SOLVED_FORM.test(e))!;
  const [lhs, rhs] = standard.split("=");
  if (!lhs || !rhs) return false;
  if (!lhs.includes("x") || !lhs.includes("y")) return false;
  if (/[xy]/.test(rhs)) return false;

  // The solved equation defines one variable purely in terms of the other.
  const sub = SOLVED_FORM.exec(solved[0]!)![1]!;
  const free = sub === "y" ? "x" : "y";
  const body = solved[0]!.split("=")[1]!;
  if (body.includes(sub)) return false;
  if (evaluate(body, point) === null) return false;

  // Unique solution: walk one step along equation 1 and the standard-form
  // equation must break. This is the not-parallel check.
  const stepped = { ...point, [free]: point[free as "x" | "y"] + 1 };
  const alongLine = evaluate(body, stepped);
  if (alongLine === null) return false;
  const neighbour = { ...stepped, [sub]: alongLine };
  if (sidesAgree(standard, neighbour as Record<string, number>)) return false;

  const wrong = trapAnswer(item.trap);
  if (wrong === null || wrong === item.solution) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
