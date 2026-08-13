// 7.EE.B.4 -- solving and graphing inequalities.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   form:    ax + b {<,>,<=,>=} c
//   require: a < 0 in >= half of items
//   error:   fails to flip sign; wrong dot fill; wrong arrow direction
//
// Error signatures (brief.md §5): NO_FLIP, OVER_FLIP, WRONG_ARROW, WRONG_DOT
// Tier 3. In brief.md §3's graph this sits below variables-on-both-sides,
// which sits below like terms, which sits on Gate 0.
//
// brief.md §5 calls out OVER_FLIP specifically -- flipping the sign when
// merely adding or subtracting a negative. Half-remembering the rule is its
// own failure mode, and the distractor below encodes it.
//
// All three named errors are graph-level, so the item asks for the graph in
// words -- dot fill and arrow direction -- not just the solved inequality.
// Both are computed from the solution, so both are verified.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";
import { renderConstant, renderTerm } from "../linear.ts";

const STANDARD = "7.EE.B.4" as const;
const TIER: Tier = 3;

const DIRECTIVE = "Solve, then describe the graph:";

const OPERATORS = ["<", ">", "<=", ">="] as const;
type Operator = (typeof OPERATORS)[number];

const FLIPPED: Record<Operator, Operator> = {
  "<": ">",
  ">": "<",
  "<=": ">=",
  ">=": "<=",
};

function holds(left: number, op: Operator, right: number): boolean {
  switch (op) {
    case "<":
      return left < right;
    case ">":
      return left > right;
    case "<=":
      return left <= right;
    case ">=":
      return left >= right;
  }
}

const isClosed = (op: Operator): boolean => op.includes("=");
const pointsRight = (op: Operator): boolean => op.startsWith(">");

function describe(op: Operator, boundary: number): string {
  return `x ${op} ${boundary} (${isClosed(op) ? "closed" : "open"} dot at ${boundary}, arrow ${pointsRight(op) ? "right" : "left"})`;
}

// ---------------------------------------------------------------------------

function generate(rng: RNG): Item {
  const magnitude = rng.int(2, 9);
  const a = rng.bool(0.6) ? -magnitude : magnitude;
  const b = rng.int(-9, 9) || 4;
  const boundary = rng.int(-9, 9);
  const op = rng.pick(OPERATORS);

  // Build c from the boundary so the solution is always an integer.
  const c = a * boundary + b;
  const solved = a < 0 ? FLIPPED[op] : op;

  const question = `${renderTerm(a, "x")}${renderConstant(b)} ${op} ${c}`;

  const work = [
    `Treat it exactly like an equation until the very last step.`,
    b < 0
      ? `${b} is negative, so clearing it means ADDING ${Math.abs(b)} to both sides:`
      : `Subtract ${b} from both sides:`,
    `  ${renderTerm(a, "x")} ${op} ${a * boundary}`,
    `Now divide both sides by ${a}.`,
  ];
  if (a < 0) {
    work.push(
      `${a} is NEGATIVE, so the inequality sign FLIPS:  ${op} becomes ${solved}`,
    );
  } else {
    work.push(
      `${a} is positive, so the sign does NOT change. Only dividing by a negative flips it.`,
    );
  }
  work.push(
    `x ${solved} ${boundary}`,
    `Graph: ${isClosed(solved) ? "CLOSED" : "OPEN"} dot at ${boundary} (${isClosed(solved) ? "the boundary is included" : "the boundary is not included"}), arrow ${pointsRight(solved) ? "RIGHT" : "LEFT"}.`,
  );

  // One computation, two diagnoses. Reversing the final sign is the missing
  // flip when the coefficient is negative, and a flip applied where none was
  // needed when it is positive -- so which signature it is depends on sign(a),
  // and the arithmetic is identical either way.
  //
  // Only signatures reachable from her WRITTEN ANSWER go here. WRONG_DOT and
  // WRONG_ARROW are graphing errors: she can write a correct inequality and
  // still draw the line wrong, and grade reads one text field. Listing them
  // would claim coverage the classifier does not have.
  const flipSignature = a < 0 ? "NO_FLIP" : "OVER_FLIP";
  const predictedErrors = {
    [flipSignature]: describe(FLIPPED[solved], boundary),
  };
  const meaning =
    a < 0
      ? `did not flip the sign. Dividing both sides by ${a}, a negative, reverses the inequality`
      : `flipped the sign when nothing needed flipping. The rule fires only when you multiply or divide by a negative, and ${a} is positive`;

  return {
    standard: STANDARD,
    prompt: `${DIRECTIVE}  ${question}`,
    solution: describe(solved, boundary),
    work,
    // Derived, not recomputed: the distractor on the key and the prediction
    // grade classifies against must be the same string or they will drift.
    trap: trap(predictedErrors[flipSignature]!, meaning),
    predictedErrors,
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- boundary satisfies equality, then one point inside and one
// outside the solution set
// ---------------------------------------------------------------------------

const QUESTION_RE = /^(-?\d*)x\s*([+-])\s*(\d+)\s*(<=|>=|<|>)\s*(-?\d+)$/;
const SOLUTION_RE =
  /^x (<=|>=|<|>) (-?\d+) \((open|closed) dot at (-?\d+), arrow (left|right)\)$/;

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;
  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;

  const asked = QUESTION_RE.exec(item.prompt.slice(DIRECTIVE.length).trim());
  if (!asked) return false;

  const rawCoefficient = asked[1]!;
  const a =
    rawCoefficient === "" ? 1 : rawCoefficient === "-" ? -1 : Number(rawCoefficient);
  if (a === 0) return false;
  const b = (asked[2] === "-" ? -1 : 1) * Number(asked[3]);
  const op = asked[4] as Operator;
  const c = Number(asked[5]);

  const claimed = SOLUTION_RE.exec(item.solution);
  if (!claimed) return false;
  const solved = claimed[1] as Operator;
  const boundary = Number(claimed[2]);
  if (Number(claimed[4]) !== boundary) return false; // dot must sit on it

  // 1. The boundary satisfies the equality.
  if (a * boundary + b !== c) return false;

  // 2. A point inside the solution set satisfies the original inequality.
  const inside = pointsRight(solved) ? boundary + 1 : boundary - 1;
  if (!holds(a * inside + b, op, c)) return false;

  // 3. A point outside it does not.
  const outside = pointsRight(solved) ? boundary - 1 : boundary + 1;
  if (holds(a * outside + b, op, c)) return false;

  // 4. The graph description matches the solved inequality.
  if ((claimed[3] === "closed") !== isClosed(solved)) return false;
  if ((claimed[5] === "right") !== pointsRight(solved)) return false;

  const wrong = trapAnswer(item.trap);
  if (wrong === null || wrong === item.solution) return false;

  // The predicted error must be exactly what the printed problem produces
  // when the flip rule is misapplied -- recomputed here from the parsed
  // coefficient, not taken from the generator.
  const expectedSignature = a < 0 ? "NO_FLIP" : "OVER_FLIP";
  const predicted = item.predictedErrors?.[expectedSignature];
  if (predicted === undefined) return false;
  if (Object.keys(item.predictedErrors ?? {}).length !== 1) return false;
  if (predicted !== describe(FLIPPED[solved], boundary)) return false;
  // And the key's distractor must be that same string, not a second copy.
  if (wrong !== predicted) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
  balance: {
    label: "negative coefficient on x",
    // Item spec: a < 0 in at least half the items.
    holds: (item) => /:\s+-\d*x/.test(item.prompt),
  },
};

export default generator;
