// 8.EE.A.1 -- exponent rules.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   forms:   x^a * x^b | x^a / x^b | (x^a)^b | x^0 | x^(-a)
//   range:   a,b in [2, 8]
//   error:   multiplies exponents when multiplying bases
//
// Error signatures (brief.md §5): MULT_VS_ADD_EXP, ZERO_EXP, NEG_EXP
// Tier 2: near-independent of Gate 0 in brief.md §3's graph, so it can run
// early and in parallel with everything else.
//
// The specified verifier for this standard is "substitute a numeric base into
// both forms, assert equal". That is done literally below: the printed problem and
// the printed answer are each parsed and evaluated at two different bases as
// exact BigInt rationals. Nothing in the check knows the exponent rules, so a
// wrong rule in the generator cannot agree with itself.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";

const STANDARD = "8.EE.A.1" as const;
const TIER: Tier = 2;

const EXP_MIN = 2;
const EXP_MAX = 8;
const BASES = ["x", "y", "n", "m"] as const;
const TEST_BASES = [2n, 3n];

const DIRECTIVE = "Simplify:";

type Form = "product" | "quotient" | "power of a power" | "zero" | "negative";

const FORMS: readonly Form[] = [
  "product",
  "quotient",
  "power of a power",
  "zero",
  "negative",
];

// ---------------------------------------------------------------------------
// exact rational arithmetic, so 1/x^5 is representable without floats
// ---------------------------------------------------------------------------

interface Rat {
  n: bigint;
  d: bigint;
}

function rat(n: bigint, d = 1n): Rat {
  if (d === 0n) throw new Error("division by zero");
  return d < 0n ? { n: -n, d: -d } : { n, d };
}

const mul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d);
const div = (a: Rat, b: Rat): Rat => rat(a.n * b.d, a.d * b.n);
const neg = (a: Rat): Rat => rat(-a.n, a.d);
const eq = (a: Rat, b: Rat): boolean => a.n * b.d === b.n * a.d;

function pow(base: Rat, exponent: bigint): Rat {
  if (exponent < 0n) return div(rat(1n), pow(base, -exponent));
  return rat(base.n ** exponent, base.d ** exponent);
}

// ---------------------------------------------------------------------------
// a small parser over exactly the shapes this standard prints
//
//   expr  := unary (('*' | '/') unary)*
//   unary := '-' unary | power
//   power := atom ('^' unary)?
//   atom  := '(' expr ')' | identifier | integer
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0;
  constructor(
    private readonly src: string,
    private readonly base: Rat,
  ) {}

  static evaluate(src: string, base: bigint): Rat | null {
    try {
      const p = new Parser(src, rat(base));
      const value = p.expr();
      p.skip();
      return p.pos === p.src.length ? value : null;
    } catch {
      return null;
    }
  }

  private skip(): void {
    while (this.pos < this.src.length && this.src[this.pos] === " ") this.pos++;
  }

  private eat(token: string): boolean {
    this.skip();
    if (this.src.startsWith(token, this.pos)) {
      this.pos += token.length;
      return true;
    }
    return false;
  }

  private expr(): Rat {
    let value = this.unary();
    for (;;) {
      if (this.eat("*")) value = mul(value, this.unary());
      else if (this.eat("/")) value = div(value, this.unary());
      else return value;
    }
  }

  private unary(): Rat {
    if (this.eat("-")) return neg(this.unary());
    return this.power();
  }

  private power(): Rat {
    const base = this.atom();
    if (!this.eat("^")) return base;
    const exponent = this.unary();
    if (exponent.d !== 1n) throw new Error("non-integer exponent");
    return pow(base, exponent.n);
  }

  private atom(): Rat {
    this.skip();
    if (this.eat("(")) {
      const value = this.expr();
      if (!this.eat(")")) throw new Error("unbalanced parentheses");
      return value;
    }
    const rest = this.src.slice(this.pos);
    const ident = /^[a-z]/.exec(rest);
    if (ident) {
      this.pos += 1;
      return this.base;
    }
    const number = /^\d+/.exec(rest);
    if (number) {
      this.pos += number[0].length;
      return rat(BigInt(number[0]));
    }
    throw new Error(`unexpected input at ${this.pos}`);
  }
}

/** True when two printed expressions agree at every test base. */
function agreeAtEveryBase(left: string, right: string): boolean {
  for (const base of TEST_BASES) {
    const a = Parser.evaluate(left, base);
    const b = Parser.evaluate(right, base);
    if (a === null || b === null) return false;
    if (!eq(a, b)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

/** x^1 prints as x; x^0 never reaches here. */
function power(base: string, exponent: number): string {
  return exponent === 1 ? base : `${base}^${exponent}`;
}

function generate(rng: RNG): Item {
  const form = rng.pick(FORMS);
  const x = rng.pick(BASES);

  let question: string;
  let answer: string;
  let work: string[];
  let trapText: string;

  switch (form) {
    case "product": {
      const a = rng.int(EXP_MIN, EXP_MAX);
      const b = rng.int(EXP_MIN, EXP_MAX);
      question = `${power(x, a)} * ${power(x, b)}`;
      answer = power(x, a + b);
      work = [
        `Same base, multiplied: ADD the exponents.`,
        `${x}^${a} * ${x}^${b}  =  ${x}^(${a} + ${b})  =  ${answer}`,
      ];
      // The named error for this standard.
      trapText = trap(
        power(x, a * b),
        `multiplied the exponents. Multiplying powers of the same base adds them; multiplying is what a power of a power does`,
      );
      break;
    }

    case "quotient": {
      // a > b keeps the answer a positive power; negative exponents get their
      // own form below, where the expected answer shape is unambiguous.
      // Draw the gap first, or a uniform a and b bunch up at a difference of
      // 1 and most answers come out as a bare variable.
      const gap = rng.int(1, EXP_MAX - EXP_MIN);
      const b = rng.int(EXP_MIN, EXP_MAX - gap);
      const a = b + gap;
      question = `${power(x, a)} / ${power(x, b)}`;
      answer = power(x, a - b);
      work = [
        `Same base, divided: SUBTRACT the exponents.`,
        `${x}^${a} / ${x}^${b}  =  ${x}^(${a} - ${b})  =  ${answer}`,
      ];
      trapText = trap(
        `${x}^(${b - a})`,
        `subtracted the exponents in the wrong order -- top exponent minus bottom, not the reverse`,
      );
      break;
    }

    case "power of a power": {
      const a = rng.int(EXP_MIN, EXP_MAX);
      const b = rng.int(EXP_MIN, EXP_MAX);
      question = `(${power(x, a)})^${b}`;
      answer = power(x, a * b);
      work = [
        `A power raised to a power: MULTIPLY the exponents.`,
        `(${x}^${a})^${b}  =  ${x}^(${a} x ${b})  =  ${answer}`,
      ];
      trapText = trap(
        power(x, a + b),
        `added the exponents. Adding is for multiplying two powers; a power of a power multiplies`,
      );
      break;
    }

    case "zero": {
      const numericBase = rng.bool();
      const shown = numericBase ? String(rng.int(2, 20)) : x;
      question = `${shown}^0`;
      answer = "1";
      work = [
        `Anything (except 0) raised to the power 0 is 1.`,
        `Why: ${shown}^3 / ${shown}^3 = ${shown}^(3 - 3) = ${shown}^0, and anything over itself is 1.`,
      ];
      trapText = trap(
        "0",
        `read the exponent as the answer. The exponent is 0, but the value is 1`,
      );
      break;
    }

    case "negative": {
      const a = rng.int(EXP_MIN, EXP_MAX);
      question = `${x}^(-${a})`;
      answer = `1/${x}^${a}`;
      work = [
        `A negative exponent means reciprocal, not negative.`,
        `${x}^(-${a})  =  1/${x}^${a}`,
      ];
      trapText = trap(
        `-${x}^${a}`,
        `made the VALUE negative. The minus sign flips the power into the denominator; it does not change the sign`,
      );
      break;
    }
  }

  return {
    standard: STANDARD,
    prompt: `${DIRECTIVE}  ${question}`,
    solution: answer,
    work,
    trap: trapText,
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- substitute a numeric base into both forms, assert equal
// ---------------------------------------------------------------------------

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;
  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;

  const question = item.prompt.slice(DIRECTIVE.length).trim();

  // Item spec: exponents live in [2, 8]. 0 and 1 are legal only where the
  // form itself calls for them (x^0, and x^1 printed as x).
  for (const match of question.matchAll(/\^\(?(-?\d+)\)?/g)) {
    const exponent = Math.abs(Number(match[1]));
    if (exponent !== 0 && (exponent < EXP_MIN || exponent > EXP_MAX)) return false;
  }

  // A single variable throughout, or none at all for the numeric x^0 case.
  const variables = new Set(question.match(/[a-z]/g) ?? []);
  if (variables.size > 1) return false;

  if (!agreeAtEveryBase(question, item.solution)) return false;

  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  // The distractor must be a real expression, and must NOT be equivalent to
  // the answer -- x^2 * x^2 and (x^2)^2 both give x^4, so the loop rejects it.
  if (Parser.evaluate(wrong, TEST_BASES[0]!) === null) return false;
  if (agreeAtEveryBase(wrong, item.solution)) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
