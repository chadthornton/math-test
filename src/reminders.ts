// Reminder sheets -- brief.md §5. One per node, fixed structure:
//
//   RULE        1-3 bullets. The thing itself.
//   SEQUENCE    numbered steps. "Do this, then this."
//   EXAMPLE     one canonical worked instance.
//   TRAPS       bulleted, each tagged with an error signature.
//
// ============================ AUTHORED CONTENT =============================
//
// Everything in this file except the EXAMPLE is authored prose. Per CLAUDE.md's
// authored-vs-generated split, the tool may select, rank and order it but must
// never write it. brief.md §5 gives the reason: "regenerating reminder prose
// from scratch each time reintroduces math errors."
//
// This is the highest-risk content in the repository. No verifier can catch a
// confidently wrong statement of the flip rule, and this is the sheet she reads
// BEFORE working. It needs human review, once, and then it should stop
// changing.
//
// The EXAMPLE is deliberately not here. It is a generated, verified item, so
// the one worked instance on the sheet cannot be wrong even though the prose
// around it is unverifiable.
//
// The revision mechanism is re-ranking, not rewriting: traps she has actually
// hit (from log.md signatures) get promoted to the top and marked. See
// rankTraps() below.

import type { Standard } from "./generate.ts";

export interface Trap {
  signature: string;
  text: string;
}

export interface Reminder {
  title: string;
  rule: string[];
  sequence: string[];
  traps: Trap[];
}

export const REMINDERS: Partial<Record<Standard, Reminder>> = {
  "7.NS.A.1": {
    title: "Signed arithmetic -- adding and subtracting negatives",
    rule: [
      "Adding a negative moves LEFT. Subtracting a negative moves RIGHT.",
      "Two signs in a row cancel:  a - (-b)  is  a + b.",
      "Same signs: add the magnitudes, keep the sign. Different signs: subtract the smaller magnitude from the larger and keep the sign of the larger.",
    ],
    sequence: [
      "Rewrite every  + (-n)  as  - n,  and every  - (-n)  as  + n.",
      "Work left to right. Do not regroup.",
      "Check the SIGN before the digits: which side of zero did you end on?",
    ],
    traps: [
      { signature: "DOUBLE_NEG", text: "Read  - (-b)  as  - b.  Two minus signs cancel; the move goes right." },
      { signature: "SIGN_RULE", text: "Added the magnitudes when the signs differed, or subtracted them when the signs matched." },
      { signature: "SUBTRACT_ORDER", text: "a - b is not b - a. Subtraction does not commute." },
    ],
  },

  "5.NBT.B.5": {
    title: "Multi-digit multiplication",
    rule: [
      "Split a two-digit factor by place value:  47 = 40 + 7.",
      "Every partial product keeps its place. The tens row ends in a zero.",
      "A decimal point never changes the digits, only where the point lands.",
    ],
    sequence: [
      "Break the second factor into tens + ones.",
      "Multiply the whole first factor by each part.",
      "Add the partial products.",
      "Decimals: multiply as whole numbers, then count the decimal places in BOTH factors and put that many into the answer.",
    ],
    traps: [
      { signature: "PLACE_VALUE", text: "Multiplied by the tens DIGIT instead of the tens VALUE -- by 3 instead of by 30." },
      { signature: "CARRY", text: "Dropped a carry between columns." },
      { signature: "SLOW", text: "Correct but slow. That is a fluency problem, not a method problem -- drill it, do not re-teach it." },
    ],
  },

  "8.EE.A.1": {
    title: "Exponent rules",
    rule: [
      "Same base MULTIPLIED: add the exponents.  Same base DIVIDED: subtract, top minus bottom.",
      "A power raised to a power: multiply the exponents.",
      "Anything except 0 to the power 0 is 1. A negative exponent means reciprocal, not a negative number.",
    ],
    sequence: [
      "Check the bases match. If they do not, none of these rules apply.",
      "Name the operation: multiplying, dividing, or a power of a power.",
      "Apply the rule to the EXPONENTS only. The base never changes.",
    ],
    traps: [
      { signature: "MULT_VS_ADD_EXP", text: "Multiplied the exponents when multiplying the bases. Multiplying bases ADDS exponents; multiplying exponents is what a power of a power does." },
      { signature: "ZERO_EXP", text: "Answered x^0 as 0. It is 1." },
      { signature: "NEG_EXP", text: "Answered x^(-3) as -x^3. It is 1/x^3 -- the sign flips the power into the denominator, it does not make the value negative." },
    ],
  },

  "8.EE.A.2": {
    title: "Square and cube roots",
    rule: [
      "sqrt(n) asks: what number times itself gives n?",
      "To simplify, pull out the LARGEST perfect square that divides n.",
      "What comes out of the radical is the square ROOT of what you pulled out, not the factor itself.",
    ],
    sequence: [
      "Recall the squares: 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196.",
      "Find the largest one that divides n.",
      "sqrt(n) = sqrt(square) x sqrt(rest). Take the root of the square.",
      "Check: whatever is left inside must have no perfect-square factor left.",
    ],
    traps: [
      { signature: "NON_MAXIMAL_FACTOR", text: "Pulled out 4 when 36 also divided. sqrt(72) is 6 sqrt(2), not 2 sqrt(18) -- if the number inside still has a square factor, you are not finished." },
      { signature: "CUBE_VS_SQUARE", text: "A cube root uses the number three times, not twice. cbrt(27) is 3, not 9." },
      { signature: "PERFECT_SQ_RECALL", text: "Off by one in the squares table. Check any root by multiplying it back." },
    ],
  },

  "7.EE.A.1": {
    title: "Combining like terms",
    rule: [
      "A multiplier outside parentheses reaches EVERY term inside.",
      "The sign belongs to the multiplier:  -2(3x - 5)  is  -6x + 10.",
      "Only like terms combine. x terms with x terms, numbers with numbers.",
    ],
    sequence: [
      "Distribute. Both terms. Watch the sign.",
      "Rewrite the whole expression with no parentheses left.",
      "Collect the x terms.",
      "Collect the numbers.",
    ],
    traps: [
      { signature: "PARTIAL_DISTRIBUTE", text: "Multiplied the first term inside and forgot the second." },
      { signature: "SIGN_DISTRIBUTE", text: "Dropped the negative on the second term. -2 x -5 is +10." },
      { signature: "UNLIKE_TERMS", text: "Added an x coefficient to a plain number. 3x and 4 do not merge." },
    ],
  },

  "7.EE.B.4": {
    title: "Solving and graphing inequalities",
    rule: [
      "Solve it exactly like an equation, with one extra rule.",
      "Multiplying or DIVIDING by a negative flips the inequality sign. Adding or subtracting a negative does NOT.",
      "Strict signs (< >) get an open dot. Signs with a line under them (<= >=) get a closed dot.",
    ],
    sequence: [
      "Get x alone using the same moves as an equation.",
      "If the last move multiplied or divided by a negative, flip the sign.",
      "Dot: open for strict, closed if the line is under the sign.",
      "Arrow: with x on the left, the sign points the way the arrow goes.",
    ],
    traps: [
      { signature: "NO_FLIP", text: "Divided by a negative and left the sign alone." },
      { signature: "OVER_FLIP", text: "Flipped when only adding or subtracting a negative. The rule needs a multiply or a divide -- half-remembering it is its own mistake." },
      { signature: "WRONG_DOT", text: "Filled the dot for < , or left it open for <= ." },
      { signature: "WRONG_ARROW", text: "Drew the arrow the wrong way. Put x on the left first, then follow the sign." },
    ],
  },

  "8.EE.C.7b": {
    title: "Equations with variables on both sides",
    rule: [
      "x on both sides means the first job is getting the x terms together.",
      "Whatever you do to one side, do to the other.",
      "A term moved across the equals sign changes its sign.",
    ],
    sequence: [
      "Pick a side to collect x on. Subtract the other x term from both sides.",
      "Move the constant away from the x.",
      "Divide by the coefficient.",
      "Substitute your answer into BOTH original sides and check they match.",
    ],
    traps: [
      { signature: "SIGN_MOVE", text: "Moved a term across without changing its sign." },
      { signature: "COLLECT_WRONG_SIDE", text: "Collected onto the side that left a negative coefficient, then lost the sign when dividing. Not wrong, but it makes the next step harder than it needs to be." },
    ],
  },

  "8.EE.C.8b": {
    title: "Systems by SUBSTITUTION",
    rule: [
      "One equation is already solved for a variable. Put that whole expression into the other equation.",
      "PARENTHESES around whatever you substitute. Always.",
      "Two unknowns means two answers. Finding x is half the job.",
    ],
    sequence: [
      "Find the equation that is already solved for a variable.",
      "Substitute it into the OTHER equation, in parentheses.",
      "Distribute, combine, and solve for the one remaining variable.",
      "Put that value back into equation 1 to get the other variable.",
      "Check the pair in BOTH original equations.",
    ],
    traps: [
      { signature: "NO_PARENS_SUB", text: "Dropped the parentheses, so the multiplier only reached the first term inside." },
      { signature: "ONE_VAR_ONLY", text: "Solved for x and stopped. The answer is a pair." },
      { signature: "WRONG_SUB_TARGET", text: "Substituted back into the equation it came from, which collapses to 0 = 0 and tells you nothing." },
    ],
  },

  "8.F.A.1": {
    title: "Function vocabulary",
    rule: [
      "A relation is a FUNCTION when every input has exactly one output.",
      "A repeated OUTPUT is fine. A repeated INPUT with two different outputs is not.",
      "Domain = the set of inputs. Range = the set of outputs.",
      "Vertical line test: if any vertical line crosses the graph twice, one input has two outputs.",
    ],
    sequence: [
      "Scan the INPUTS first. Any repeats?",
      "If an input repeats, check whether its outputs differ. Different outputs means not a function.",
      "List the domain: the inputs, each once, in order.",
      "List the range: the outputs, each once, in order.",
    ],
    traps: [
      { signature: "OUTPUT_REPEAT", text: "Called it not-a-function because an OUTPUT appeared twice. Two different inputs are allowed to share an output." },
      { signature: "VLT_MISAPPLY", text: "Used a horizontal line, or applied the test to a list of pairs without actually checking the inputs." },
      { signature: "VOCAB_TERM", text: "Swapped domain and range. Domain is what goes IN." },
    ],
  },

  "8.F.B.4": {
    title: "Linear word problems",
    rule: [
      "The RATE is the part that repeats. It multiplies the variable.",
      "The STARTING VALUE happens once. It is added on its own.",
      "The answer is a sentence with units, not a bare number.",
    ],
    sequence: [
      'Define the variable in words: "Let m = the number of months."',
      "Find the rate -- the per-something number.",
      "Find the starting value -- the one-time number.",
      "Write:  rate x variable + start = target.",
      "Solve for the variable.",
      "Answer in a sentence, with units.",
    ],
    traps: [
      { signature: "RATE_SLOT", text: "Put the starting value where the rate goes. Ask which number repeats -- that one multiplies." },
      { signature: "STOPPED_AT_NUMBER", text: "Gave a number with no sentence." },
      { signature: "NO_UNITS", text: 'Wrote "9" instead of "9 months".' },
      { signature: "NO_VAR_DEF", text: "Never said what the variable stood for." },
    ],
  },
};

/**
 * Promote the traps she has actually hit. brief.md §5: "don't rewrite,
 * re-rank" -- prose stays fixed and verified while the sheet stays personal.
 * Selecting and ordering authored text is exactly what the tool is allowed to
 * do with it.
 */
export function rankTraps(traps: readonly Trap[], hit: ReadonlySet<string>): Trap[] {
  const seen = traps.filter((t) => hit.has(t.signature));
  const rest = traps.filter((t) => !hit.has(t.signature));
  return [...seen, ...rest];
}
