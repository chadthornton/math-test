// 7.NS.A.1 -- signed arithmetic (add/subtract).
//
// brief.md §5:
//   forms:   a + b | a - b | a - (-b) | -a + b | a - b - c
//   range:   |a|,|b|,|c| in [2, 20]
//   require: at least one negative operand
//   trap:    double negative (a - (-b))
//   error:   treats a - (-b) as a - b
//
// Tier 1 (brief.md §3): root node. Appears in every session.
//
// The verifier below deliberately does NOT reuse the arithmetic that produced
// the item. It re-parses the rendered prompt string and re-evaluates from
// scratch, so a bug in rendering, in the sign bookkeeping, or in the solution
// formatting all surface as a rejected item rather than a wrong answer key.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";

const STANDARD = "7.NS.A.1" as const;
const TIER: Tier = 1;

const MIN_MAG = 2;
const MAX_MAG = 20;

const DIRECTIVE = "Evaluate:";

type Form = "a+b" | "a-b" | "a-(-b)" | "-a+b" | "a-b-c";

const FORMS: readonly Form[] = ["a+b", "a-b", "a-(-b)", "-a+b", "a-b-c"];

/** A term as it will be written: the operator that precedes it, and its value. */
interface Term {
  op: "+" | "-";
  value: number;
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------

/** Operands after the first are parenthesised when negative: `8 + (-15)`. */
function operand(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

function renderExpression(head: number, tail: Term[]): string {
  return (
    `${head}` + tail.map((t) => ` ${t.op} ${operand(t.value)}`).join("")
  );
}

/** Left-to-right evaluation. Same order a student reads it in. */
function evaluate(head: number, tail: Term[]): number {
  return tail.reduce(
    (acc, t) => (t.op === "+" ? acc + t.value : acc - t.value),
    head,
  );
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

interface Built {
  head: number;
  tail: Term[];
  work: string[];
  trapValue: number;
  trapMeaning: string;
}

function build(form: Form, rng: RNG): Built {
  const m1 = rng.int(MIN_MAG, MAX_MAG);
  const m2 = rng.int(MIN_MAG, MAX_MAG);

  switch (form) {
    // a + b, written with a negative second operand: 8 + (-15), -7 + (-3)
    case "a+b": {
      const head = rng.sign() * m1;
      const tail: Term[] = [{ op: "+", value: -m2 }];
      const sum = evaluate(head, tail);
      const rewrite = `Adding a negative is the same as subtracting:  ${head} + (${-m2})  =  ${head} - ${m2}`;
      if (head > 0) {
        return {
          head,
          tail,
          work: [rewrite, `${head} - ${m2}  =  ${sum}`],
          trapValue: m1 + m2,
          trapMeaning:
            "added the magnitudes instead of finding the difference, and kept the first term's sign",
        };
      }
      return {
        head,
        tail,
        work: [
          rewrite,
          `Both moves go left, so the magnitudes add:  -(${m1} + ${m2})`,
          `=  ${sum}`,
        ],
        trapValue: m2 - m1,
        trapMeaning:
          "subtracted the magnitudes; two negatives combined move further from zero, not back toward it",
      };
    }

    // a - b, starting negative: -7 - 12
    case "a-b": {
      const head = -m1;
      const tail: Term[] = [{ op: "-", value: m2 }];
      const sum = evaluate(head, tail);
      return {
        head,
        tail,
        work: [
          `Start at ${head} and subtract ${m2} -- subtracting moves further left.`,
          `-(${m1} + ${m2})  =  ${sum}`,
        ],
        trapValue: head + m2,
        trapMeaning:
          "treated the subtraction as addition; a negative minus a positive moves further left, not back toward zero",
      };
    }

    // a - (-b): the double negative. This is the named trap.
    case "a-(-b)": {
      const head = rng.sign() * m1;
      const tail: Term[] = [{ op: "-", value: -m2 }];
      const sum = evaluate(head, tail);
      return {
        head,
        tail,
        work: [
          `Subtracting a negative is adding:  ${head} - (${-m2})  =  ${head} + ${m2}`,
          `${head} + ${m2}  =  ${sum}`,
        ],
        trapValue: head - m2,
        trapMeaning:
          "read `- (-b)` as plain subtraction; the two minus signs cancel, so subtracting a negative adds",
      };
    }

    // -a + b: -7 + 12
    case "-a+b": {
      const head = -m1;
      const tail: Term[] = [{ op: "+", value: m2 }];
      const sum = evaluate(head, tail);
      return {
        head,
        tail,
        work: [
          `Start at ${head} and add ${m2} -- adding moves right.`,
          `${m2} - ${m1}  =  ${sum}`,
        ],
        trapValue: -(m1 + m2),
        trapMeaning:
          "added the magnitudes and kept the leading negative instead of finding the difference",
      };
    }

    // a - b - c, two shapes: -a - b - c, and a - (-b) - c
    case "a-b-c": {
      const m3 = rng.int(MIN_MAG, MAX_MAG);
      const doubleNegative = rng.bool();
      const head = doubleNegative ? m1 : -m1;
      const tail: Term[] = [
        { op: "-", value: doubleNegative ? -m2 : m2 },
        { op: "-", value: m3 },
      ];
      const first = evaluate(head, tail.slice(0, 1));
      const sum = evaluate(head, tail);
      if (doubleNegative) {
        return {
          head,
          tail,
          work: [
            `Subtracting a negative is adding:  ${head} - (${-m2})  =  ${head} + ${m2}  =  ${first}`,
            `${first} - ${m3}  =  ${sum}`,
          ],
          trapValue: head - m2 - m3,
          trapMeaning:
            "read `- (-b)` as plain subtraction; the two minus signs cancel, so subtracting a negative adds",
        };
      }
      return {
        head,
        tail,
        work: [
          `Work left to right:  ${head} - ${m2}  =  ${first}`,
          `${first} - ${m3}  =  ${sum}`,
        ],
        trapValue: first + m3,
        trapMeaning:
          "dropped the second subtraction and added the last term instead",
      };
    }
  }
}

function generate(rng: RNG): Item {
  const form = rng.pick(FORMS);
  const { head, tail, work, trapValue, trapMeaning } = build(form, rng);
  const expression = renderExpression(head, tail);

  return {
    standard: STANDARD,
    prompt: `${DIRECTIVE}  ${expression}`,
    solution: String(evaluate(head, tail)),
    work,
    trap: trap(trapValue, trapMeaning),
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- independent recomputation, per spec.md
// ---------------------------------------------------------------------------

const HEAD_RE = /^(?:\((-?\d+)\)|(-?\d+))/;
const STEP_RE = /^\s*([+-])\s*(?:\((-?\d+)\)|(-?\d+))/;
const INTEGER_RE = /^-?(?:0|[1-9]\d*)$/;

interface Parsed {
  operands: number[];
  value: number;
}

/** Re-read the printed expression the way a reader would. */
function parseExpression(src: string): Parsed | null {
  let rest = src.trim();
  const head = HEAD_RE.exec(rest);
  if (!head) return null;

  const first = Number(head[1] ?? head[2]);
  const operands = [first];
  let value = first;
  rest = rest.slice(head[0].length);

  while (rest.trim().length > 0) {
    const step = STEP_RE.exec(rest);
    if (!step) return null;
    const operandValue = Number(step[2] ?? step[3]);
    operands.push(operandValue);
    value = step[1] === "+" ? value + operandValue : value - operandValue;
    rest = rest.slice(step[0].length);
  }

  return { operands, value };
}

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;

  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;
  const parsed = parseExpression(item.prompt.slice(DIRECTIVE.length));
  if (!parsed) return false;

  // brief.md §5: two or three terms, magnitudes in range, one negative operand.
  if (parsed.operands.length < 2 || parsed.operands.length > 3) return false;
  for (const n of parsed.operands) {
    const mag = Math.abs(n);
    if (mag < MIN_MAG || mag > MAX_MAG) return false;
  }
  if (!parsed.operands.some((n) => n < 0)) return false;

  // The whole point: the printed answer must equal the recomputed one.
  if (!INTEGER_RE.test(item.solution)) return false;
  if (parsed.value !== Number(item.solution)) return false;

  // checkCommon caught a distractor identical to the answer as a string;
  // this catches one that is numerically equal (`-0`, `+7`, and friends).
  const wrong = trapAnswer(item.trap);
  if (wrong === null || !INTEGER_RE.test(wrong)) return false;
  if (Number(wrong) === parsed.value) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
