// 8.EE.A.2 -- square and cube roots.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   forms:   sqrt(perfect square) | cbrt(perfect cube) | simplify sqrt(n)
//   n:       has a perfect-square factor >= 4, n <= 200
//   error:   pulls out a non-maximal factor (sqrt(72) -> 2 sqrt(18))
//
// Error signatures (brief.md §5): NON_MAXIMAL_FACTOR, CUBE_VS_SQUARE, PERFECT_SQ_RECALL
// Tier 2: near-independent of Gate 0 in brief.md §3's graph. (The earlier
// "travel week, no worksheets" framing is gone -- brief.md §1 now says
// printer access is available throughout.)
//
// NOTE on the verifier. spec.md gives it as `coeff^2 x radicand === original`.
// That check passes for 2 sqrt(18) against sqrt(72) -- 4 x 18 = 72 -- which is
// precisely the misconception this standard is built to catch. So the verifier
// below adds the missing half: the radicand must also be squarefree, which is
// what makes the extraction maximal. Without it the generator could ship the
// error as the answer key.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";

const STANDARD = "8.EE.A.2" as const;
const TIER: Tier = 2;

const MAX_RADICAND = 200;

const DIRECTIVE = "Simplify:";

type Form = "perfect square" | "perfect cube" | "simplify";

const FORMS: readonly Form[] = ["perfect square", "perfect cube", "simplify"];

// ---------------------------------------------------------------------------
// number theory, done directly so the verifier owes the generator nothing
// ---------------------------------------------------------------------------

function isSquarefree(n: number): boolean {
  if (n < 1) return false;
  for (let d = 2; d * d <= n; d++) {
    if (n % (d * d) === 0) return false;
  }
  return true;
}

function isPerfectSquare(n: number): boolean {
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** Every squarefree r >= 2 with c^2 * r <= MAX_RADICAND for some coefficient. */
function squarefreeUpTo(limit: number): number[] {
  const out: number[] = [];
  for (let n = 2; n <= limit; n++) if (isSquarefree(n)) out.push(n);
  return out;
}

/** Proper divisors of c strictly between 1 and c -- the non-maximal pulls. */
function properDivisors(c: number): number[] {
  const out: number[] = [];
  for (let d = 2; d < c; d++) if (c % d === 0) out.push(d);
  return out;
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

function radical(coefficient: number, radicand: number): string {
  if (radicand === 1) return String(coefficient);
  return coefficient === 1
    ? `sqrt(${radicand})`
    : `${coefficient} sqrt(${radicand})`;
}

function generate(rng: RNG): Item {
  const form = rng.pick(FORMS);

  let question: string;
  let answer: string;
  let work: string[];
  let trapText: string;

  if (form === "perfect square") {
    const root = rng.int(2, 14); // 14^2 = 196 <= 200
    const n = root * root;
    question = `sqrt(${n})`;
    answer = String(root);
    work = [
      `What number times itself gives ${n}?`,
      `${root} x ${root} = ${n}, so sqrt(${n}) = ${root}`,
    ];
    // Off by one in the squares table -- the real no-calculator failure. It
    // is also always an integer; halving the radicand, the other candidate,
    // is not, and every odd perfect square would be silently rejected.
    trapText = trap(
      root + 1,
      `off by one in the squares table: ${root + 1} x ${root + 1} = ${(root + 1) ** 2}, not ${n}. Check a root by multiplying it back`,
    );
  } else if (form === "perfect cube") {
    const root = rng.int(2, 5); // 5^3 = 125 <= 200
    const n = root * root * root;
    question = `cbrt(${n})`;
    answer = String(root);
    work = [
      `What number used three times gives ${n}?`,
      `${root} x ${root} x ${root} = ${n}, so cbrt(${n}) = ${root}`,
    ];
    trapText = trap(
      root * root,
      `stopped at the square root instead of the cube root -- the cube root is used three times, not twice`,
    );
  } else {
    // c^2 * r = n, with r squarefree so c is maximal by construction.
    const coefficient = rng.int(2, 6);
    const candidates = squarefreeUpTo(
      Math.floor(MAX_RADICAND / (coefficient * coefficient)),
    );
    const radicand = rng.pick(candidates);
    const n = coefficient * coefficient * radicand;

    question = `sqrt(${n})`;
    answer = radical(coefficient, radicand);
    work = [
      `Find the LARGEST perfect square that divides ${n}.`,
      `${n} = ${coefficient * coefficient} x ${radicand}, and ${coefficient * coefficient} is a perfect square.`,
      `sqrt(${n}) = sqrt(${coefficient * coefficient}) x sqrt(${radicand}) = ${answer}`,
    ];

    const divisors = properDivisors(coefficient);
    if (divisors.length > 0) {
      // The named error: a perfect-square factor that is not the largest one.
      const d = rng.pick(divisors);
      const leftover = n / (d * d);
      trapText = trap(
        radical(d, leftover),
        `pulled out ${d * d} instead of the largest perfect square ${coefficient * coefficient}. sqrt(${leftover}) still has a square factor, so it is not finished`,
      );
    } else {
      // No smaller square factor exists, so the other common slip: taking the
      // factor out without taking its root.
      trapText = trap(
        radical(coefficient * coefficient, radicand),
        `moved ${coefficient * coefficient} outside without taking its square root -- what comes out of sqrt(${coefficient * coefficient}) is ${coefficient}`,
      );
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
// verification
// ---------------------------------------------------------------------------

interface Radical {
  coefficient: number;
  radicand: number; // 1 means the answer is a whole number
}

function parseAnswer(text: string): Radical | null {
  const whole = /^(\d+)$/.exec(text.trim());
  if (whole) return { coefficient: Number(whole[1]), radicand: 1 };
  const withRadical = /^(?:(\d+) )?sqrt\((\d+)\)$/.exec(text.trim());
  if (withRadical) {
    return {
      coefficient: withRadical[1] === undefined ? 1 : Number(withRadical[1]),
      radicand: Number(withRadical[2]),
    };
  }
  return null;
}

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;
  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;

  const question = item.prompt.slice(DIRECTIVE.length).trim();
  const asked = /^(sqrt|cbrt)\((\d+)\)$/.exec(question);
  if (!asked) return false;

  const original = Number(asked[2]);
  if (original > MAX_RADICAND || original < 2) return false;

  const answer = parseAnswer(item.solution);
  if (!answer) return false;

  if (asked[1] === "cbrt") {
    if (answer.radicand !== 1) return false;
    if (answer.coefficient ** 3 !== original) return false;
  } else {
    // spec.md's stated check: coeff^2 x radicand === original.
    if (answer.coefficient ** 2 * answer.radicand !== original) return false;
    // The half spec.md leaves out. Without this, 2 sqrt(18) verifies against
    // sqrt(72) and the answer key ships the misconception.
    if (!isSquarefree(answer.radicand)) return false;
    // Item spec: the simplify form needs a perfect-square factor >= 4.
    if (answer.radicand !== 1 && answer.coefficient < 2) return false;
    if (answer.radicand === 1 && !isPerfectSquare(original)) return false;
  }

  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  const wrongRadical = parseAnswer(wrong);
  if (!wrongRadical) return false;
  // A distractor that is genuinely equal to the answer teaches nothing.
  if (
    wrongRadical.coefficient === answer.coefficient &&
    wrongRadical.radicand === answer.radicand
  ) {
    return false;
  }

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
