// A small evaluator for the linear expressions the tier 3 and 4 standards
// print, plus the matching renderer.
//
// Not in the original file plan. Four standards need to read an expression back
// out of printed text -- 7.EE.A.1 evaluates original against simplified,
// 7.EE.B.4 tests points against a boundary, 8.EE.C.7b substitutes into both
// sides, 8.EE.C.8b substitutes into both equations -- and one shared reader
// beats four copies.
//
// Grammar, which is all these standards print:
//
//   expr   := term (('+' | '-') term)*
//   term   := '-'* factor factor*          implicit multiplication: 2(3x - 5)
//   factor := number | identifier | '(' expr ')'

class Reader {
  private pos = 0;

  constructor(
    private readonly src: string,
    private readonly vars: Readonly<Record<string, number>>,
  ) {}

  static run(
    src: string,
    vars: Readonly<Record<string, number>>,
  ): number | null {
    try {
      const reader = new Reader(src, vars);
      const value = reader.expr();
      reader.skip();
      return reader.pos === reader.src.length ? value : null;
    } catch {
      return null;
    }
  }

  private skip(): void {
    while (this.pos < this.src.length && this.src[this.pos] === " ") this.pos++;
  }

  private eat(token: string): boolean {
    this.skip();
    if (this.src[this.pos] === token) {
      this.pos++;
      return true;
    }
    return false;
  }

  /** True when the next thing could begin a factor, i.e. implicit multiply. */
  private atFactor(): boolean {
    this.skip();
    const c = this.src[this.pos];
    return c !== undefined && (/[0-9a-z]/.test(c) || c === "(");
  }

  private expr(): number {
    let value = this.term();
    for (;;) {
      if (this.eat("+")) value += this.term();
      else if (this.eat("-")) value -= this.term();
      else return value;
    }
  }

  private term(): number {
    let sign = 1;
    while (this.eat("-")) sign = -sign;
    let value = this.factor();
    while (this.atFactor()) value *= this.factor();
    return sign * value;
  }

  private factor(): number {
    this.skip();
    if (this.eat("(")) {
      const value = this.expr();
      if (!this.eat(")")) throw new Error("unbalanced parentheses");
      return value;
    }
    const rest = this.src.slice(this.pos);
    const number = /^\d+(?:\.\d+)?/.exec(rest);
    if (number) {
      this.pos += number[0].length;
      return Number(number[0]);
    }
    const ident = /^[a-z]/.exec(rest);
    if (ident) {
      const name = ident[0];
      if (!(name in this.vars)) throw new Error(`unknown variable ${name}`);
      this.pos += 1;
      return this.vars[name]!;
    }
    throw new Error(`unexpected input at ${this.pos}`);
  }
}

/** Evaluate a printed expression. Returns null if it will not parse. */
export function evaluate(
  src: string,
  vars: Readonly<Record<string, number>>,
): number | null {
  return Reader.run(src, vars);
}

/** Evaluate `lhs = rhs` and report whether the two sides agree. */
export function sidesAgree(
  equation: string,
  vars: Readonly<Record<string, number>>,
): boolean {
  const parts = equation.split("=");
  if (parts.length !== 2) return false;
  const left = evaluate(parts[0]!, vars);
  const right = evaluate(parts[1]!, vars);
  if (left === null || right === null) return false;
  return Math.abs(left - right) < 1e-9;
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------

/** `1x` prints as `x`, `-1x` as `-x`. */
export function renderTerm(coefficient: number, variable: string): string {
  if (coefficient === 1) return variable;
  if (coefficient === -1) return `-${variable}`;
  return `${coefficient}${variable}`;
}

/** ` + 4` or ` - 4`; empty when the constant is zero. */
export function renderConstant(value: number): string {
  if (value === 0) return "";
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
}

/** A canonical linear expression: `3x - 4`, `x`, `-7`. */
export function renderLinear(
  coefficient: number,
  constant: number,
  variable = "x",
): string {
  if (coefficient === 0) return String(constant);
  return renderTerm(coefficient, variable) + renderConstant(constant);
}
