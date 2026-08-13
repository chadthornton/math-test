// 7.EE.A.1 -- combining like terms.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   form:    ax + b(cx + d) + e
//   require: b < 0 in >= half of items
//   error:   distributes b to first term only; combines unlike terms
//
// Error signatures (brief.md §5): PARTIAL_DISTRIBUTE, SIGN_DISTRIBUTE, UNLIKE_TERMS
// Tier 3: the first node below Gate 0 in brief.md §3's graph. Distributing a
// negative IS signed arithmetic, which is why it sits directly on the gate.
//
// The `b < 0 in >= half` requirement is a property of a BATCH, not of any one
// item, so it is declared as a balance constraint and enforced by
// generateItems() rather than left to chance.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";
import { evaluate, renderConstant, renderLinear, renderTerm } from "../linear.ts";

const STANDARD = "7.EE.A.1" as const;
const TIER: Tier = 3;

const DIRECTIVE = "Simplify:";

/** A simplified answer is one linear term and at most one constant. */
const SIMPLEST_FORM = /^(?:-?\d*x)(?: [+-] \d+)?$|^-?\d+$/;

function nonZero(rng: RNG, min: number, max: number): number {
  for (;;) {
    const n = rng.int(min, max);
    if (n !== 0) return n;
  }
}

function generate(rng: RNG): Item {
  // b is the multiplier outside the parentheses; |b| >= 2 keeps it a real
  // distribution rather than a sign flip.
  const magnitude = rng.int(2, 9);
  const b = rng.bool(0.6) ? -magnitude : magnitude;
  const a = nonZero(rng, -9, 9);
  const c = nonZero(rng, -9, 9);
  const d = nonZero(rng, -9, 9);
  const e = nonZero(rng, -9, 9);

  const coefficient = a + b * c;
  const constant = b * d + e;

  const inside = renderTerm(c, "x") + renderConstant(d);
  const outside = b < 0 ? ` - ${Math.abs(b)}` : ` + ${b}`;
  const question =
    renderTerm(a, "x") + `${outside}(${inside})` + renderConstant(e);

  const answer = renderLinear(coefficient, constant);

  const work = [
    `Distribute ${b} across BOTH terms in the parentheses:`,
    `  ${b} x ${renderTerm(c, "x")} = ${renderTerm(b * c, "x")}`,
    `  ${b} x ${d} = ${b * d}`,
    `Rewrite:  ${renderTerm(a, "x")} ${renderConstant(b * c).trim()} ${renderConstant(b * d).trim()} ${renderConstant(e).trim()}`,
    `Combine the x terms:  ${a} ${b * c >= 0 ? "+" : "-"} ${Math.abs(b * c)} = ${coefficient}`,
    `Combine the constants:  ${b * d} ${e >= 0 ? "+" : "-"} ${Math.abs(e)} = ${constant}`,
  ];

  // Three computed distractors, one per signature in brief.md §5's taxonomy.
  const distractors = [
    {
      value: renderLinear(coefficient, d + e),
      meaning: `distributed ${b} to the first term only. The ${d} inside the parentheses never got multiplied by ${b}`,
    },
    {
      value: renderLinear(coefficient, -(b * d) + e),
      meaning: `lost the sign when distributing ${b} to the ${d}. ${b} x ${d} is ${b * d}, not ${-(b * d)}`,
    },
    {
      value: String(coefficient + constant),
      meaning: `combined unlike terms -- added the x coefficient to the constant. ${renderTerm(coefficient, "x")} and ${constant} cannot merge`,
    },
  ];
  const chosen = rng.pick(distractors);

  return {
    standard: STANDARD,
    prompt: `${DIRECTIVE}  ${question}`,
    solution: answer,
    work,
    trap: trap(chosen.value, chosen.meaning),
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- evaluate original and simplified at 5 random x
// ---------------------------------------------------------------------------

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;
  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;

  const question = item.prompt.slice(DIRECTIVE.length).trim();

  // The answer must actually be simplified. Without this the original
  // expression would verify against itself at every x.
  if (!SIMPLEST_FORM.test(item.solution)) return false;
  // A constant-only answer means the x terms cancelled; not a like-terms item.
  if (!item.solution.includes("x")) return false;

  // Five x values, drawn from the item's own seed so the check is
  // deterministic per item but different across items.
  const rng = new RNG(item.seed ^ 0x5eed);
  for (let i = 0; i < 5; i++) {
    const x = rng.int(-12, 12);
    const original = evaluate(question, { x });
    const simplified = evaluate(item.solution, { x });
    if (original === null || simplified === null) return false;
    if (original !== simplified) return false;
  }

  // The distractor must be a real expression that is NOT equivalent.
  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  let differs = false;
  for (let x = -3; x <= 3; x++) {
    const wrongValue = evaluate(wrong, { x });
    const right = evaluate(item.solution, { x });
    if (wrongValue === null || right === null) return false;
    if (wrongValue !== right) differs = true;
  }
  return differs;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
  balance: {
    label: "negative multiplier outside the parentheses",
    // Item spec: b < 0 in at least half the items.
    holds: (item) => / - \d+\(/.test(item.prompt),
  },
};

export default generator;
