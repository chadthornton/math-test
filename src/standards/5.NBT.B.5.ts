// 5.NBT.B.5 -- multiplication fluency.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   forms:   2-digit x 1-digit | 2-digit x 2-digit | decimal x decimal
//   range:   [12, 99]
//   no calculator; time per item ~= 20s
//   error:   place value in partial products; decimal place count
//
// Error signatures (brief.md §5): PLACE_VALUE, CARRY, SLOW
//
// Tier 2, not tier 1. brief.md §3 says multiplication AUTOMATICITY is handled
// by a separate drilling app, and it is: the 1-10 times table is drilled there
// and is never generated here. What is left is the multi-digit ALGORITHM,
// which is a procedure rather than a recall gate. The smallest item this
// module can produce is 12 x 2.
//
// Keeping it off tier 1 matters. Tier 1 means "appears in EVERY session"
// (assemble.ts rule 3), and brief.md §9 wants that slot for Gate 0, which is
// signed arithmetic. At tier 2 multiplication still lands in the interleaved
// mix regularly without diluting the daily guarantee.
//
// It belongs on paper rather than in the drilling app because the diagnosis
// lives in the partial products: 76 x 37 -> 760 only identifies a missing
// column shift if the work is visible. An app comparing a typed answer against
// a product cannot see which partial product went wrong.
//
// On decimals and the "integer solutions only" global constraint: that rule
// bars fractional and non-terminating answers, which are a no-calculator
// problem. An exact decimal product is neither, and `decimal place count` is
// one of the two misconceptions this standard exists to expose -- so the
// decimal form stays. All decimal arithmetic below is done in integers and
// the point is placed afterwards, so no float error can reach the key.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";

const STANDARD = "5.NBT.B.5" as const;
const TIER: Tier = 2;

const TWO_DIGIT_MIN = 12;
const TWO_DIGIT_MAX = 99;
const ONE_DIGIT_MIN = 2;
const ONE_DIGIT_MAX = 9;

const DIRECTIVE = "Multiply:";

type Form = "2d x 1d" | "2d x 2d" | "decimal x decimal";

const FORMS: readonly Form[] = ["2d x 1d", "2d x 2d", "decimal x decimal"];

// ---------------------------------------------------------------------------
// exact decimals, held as (digits, places): 2.82 is (282, 2)
// ---------------------------------------------------------------------------

interface Decimal {
  digits: number;
  places: number;
}

/** Exact rendering. `(6, 1)` -> `0.6`, `(282, 2)` -> `2.82`. */
function show(d: Decimal): string {
  if (d.places === 0) return String(d.digits);
  const padded = String(d.digits).padStart(d.places + 1, "0");
  const cut = padded.length - d.places;
  return `${padded.slice(0, cut)}.${padded.slice(cut)}`;
}

/** Canonical form for the answer key: 3.00 prints as 3, 2.820 as 2.82. */
function showTrimmed(d: Decimal): string {
  if (d.places === 0) return String(d.digits);
  return show(d).replace(/0+$/, "").replace(/\.$/, "");
}

function parseDecimal(text: string): Decimal | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  return { digits: Number(m[1]! + frac), places: frac.length };
}

/** Exact equality across differing place counts: 3 === 3.00. */
function sameValue(a: Decimal, b: Decimal): boolean {
  const scale = Math.max(a.places, b.places);
  return (
    a.digits * 10 ** (scale - a.places) === b.digits * 10 ** (scale - b.places)
  );
}

function multiply(a: Decimal, b: Decimal): Decimal {
  return { digits: a.digits * b.digits, places: a.places + b.places };
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

function pad(n: number | string, width: number): string {
  return String(n).padStart(width);
}

function places(n: number): string {
  return `${n} decimal place${n === 1 ? "" : "s"}`;
}

/**
 * A factor whose digits end in zero would print a redundant trailing zero
 * (0.90, 9.0). Nudge it off the multiple of ten -- both ranges have room.
 */
function noTrailingZero(digits: number): number {
  return digits % 10 === 0 ? digits + 1 : digits;
}

function generate(rng: RNG): Item {
  const form = rng.pick(FORMS);

  let a: Decimal;
  let b: Decimal;
  let work: string[];
  let trapText: string;

  if (form === "2d x 1d") {
    const whole = rng.int(TWO_DIGIT_MIN, TWO_DIGIT_MAX);
    const single = rng.int(ONE_DIGIT_MIN, ONE_DIGIT_MAX);
    a = { digits: whole, places: 0 };
    b = { digits: single, places: 0 };

    const tens = Math.floor(whole / 10) * 10;
    const ones = whole % 10;
    const width = String(tens * single).length;
    work = [
      `Break ${whole} into ${tens} + ${ones}:`,
      `  ${tens} x ${single}  =  ${pad(tens * single, width)}`,
      `  ${pad(ones, String(tens).length)} x ${single}  =  ${pad(ones * single, width)}`,
      `Add the partial products:  ${tens * single} + ${ones * single}  =  ${whole * single}`,
    ];
    // The place-value slip: 4 x 8 instead of 40 x 8 in the first partial product.
    trapText = trap(
      Math.floor(whole / 10) * single + ones * single,
      `multiplied the tens digit as ${Math.floor(whole / 10)} instead of ${tens} -- the first partial product loses a place`,
    );
  } else if (form === "2d x 2d") {
    const left = rng.int(TWO_DIGIT_MIN, TWO_DIGIT_MAX);
    const right = rng.int(TWO_DIGIT_MIN, TWO_DIGIT_MAX);
    a = { digits: left, places: 0 };
    b = { digits: right, places: 0 };

    const tens = Math.floor(right / 10) * 10;
    const ones = right % 10;
    const width = String(left * tens).length;
    work = [
      `Break ${right} into ${tens} + ${ones}:`,
      `  ${left} x ${pad(tens, 2)}  =  ${pad(left * tens, width)}`,
      `  ${left} x ${pad(ones, 2)}  =  ${pad(left * ones, width)}`,
      `Add the partial products:  ${left * tens} + ${left * ones}  =  ${left * right}`,
    ];
    // The classic: second partial product never gets shifted a column left.
    trapText = trap(
      left * Math.floor(right / 10) + left * ones,
      `did not shift the second partial product a column left -- it was added as ${left} x ${Math.floor(right / 10)}, not ${left} x ${tens}`,
    );
  } else {
    // Digit strings stay in the stated range; the point moves, not the digits.
    const leftDigits = noTrailingZero(rng.int(TWO_DIGIT_MIN, TWO_DIGIT_MAX));
    const rightDigits = noTrailingZero(
      rng.bool()
        ? rng.int(TWO_DIGIT_MIN, TWO_DIGIT_MAX)
        : rng.int(ONE_DIGIT_MIN, ONE_DIGIT_MAX),
    );
    // Cap the answer at three places. Two 2-place factors gives four, which
    // is past the ~20s-per-item budget in the item spec above.
    const leftPlaces = rng.int(1, 2);
    a = { digits: leftDigits, places: leftPlaces };
    b = { digits: rightDigits, places: leftPlaces === 2 ? 1 : rng.int(1, 2) };
    const product = multiply(a, b);

    work = [
      `Ignore the points and multiply the digits:  ${a.digits} x ${b.digits}  =  ${product.digits}`,
      `Count decimal places:  ${show(a)} has ${a.places}, ${show(b)} has ${b.places}  ->  ${product.places}`,
      `Put ${places(product.places)} back into ${product.digits}:  ${show(product)}` +
        (show(product) === showTrimmed(product)
          ? ""
          : `  =  ${showTrimmed(product)}`),
    ];
    // Off-by-one on the place count -- the named misconception.
    trapText = trap(
      showTrimmed({ digits: product.digits, places: product.places - 1 }),
      `counted ${places(product.places - 1)} instead of ${product.places} -- the answer needs as many places as both factors together`,
    );
  }

  const product = multiply(a, b);

  return {
    standard: STANDARD,
    prompt: `${DIRECTIVE}  ${show(a)} x ${show(b)}`,
    solution: showTrimmed(product),
    work,
    trap: trapText,
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- recompute the product from the printed factors
// ---------------------------------------------------------------------------

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;
  if (!item.prompt.startsWith(`${DIRECTIVE}  `)) return false;

  const printed = item.prompt.slice(DIRECTIVE.length).trim().split(" x ");
  if (printed.length !== 2) return false;

  const a = parseDecimal(printed[0]!);
  const b = parseDecimal(printed[1]!);
  if (!a || !b) return false;

  // Item spec: digit strings in [12, 99], or a single digit in [2, 9].
  for (const factor of [a, b]) {
    if (factor.places > 2) return false;
    // A printed factor must not carry a redundant trailing zero (0.90, 9.0).
    if (factor.places > 0 && factor.digits % 10 === 0) return false;
    const inSingle =
      factor.digits >= ONE_DIGIT_MIN && factor.digits <= ONE_DIGIT_MAX;
    const inDouble =
      factor.digits >= TWO_DIGIT_MIN && factor.digits <= TWO_DIGIT_MAX;
    if (!inSingle && !inDouble) return false;
  }
  if (a.digits < TWO_DIGIT_MIN && b.digits < TWO_DIGIT_MIN) return false;
  if (a.places + b.places > 3) return false; // ~20s per item

  const expected = multiply(a, b);
  const claimed = parseDecimal(item.solution);
  if (!claimed) return false;
  if (!sameValue(expected, claimed)) return false;

  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  const wrongValue = parseDecimal(wrong);
  if (!wrongValue) return false;
  if (sameValue(expected, wrongValue)) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
