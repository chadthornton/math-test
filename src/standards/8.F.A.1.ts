// 8.F.A.1 -- function vocabulary.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   forms:   set of ordered pairs | table | graph description | verbal relation
//   terms she must produce: input, output, domain, range, function,
//           vertical line test, relation
//   error:   believes repeated OUTPUT breaks functionhood (it doesn't)
//
// Error signatures (brief.md §5): OUTPUT_REPEAT, VLT_MISAPPLY, VOCAB_TERM
// brief.md §10 is specific: the existing material tests whether she can APPLY a
// function rule, not whether she knows the WORDS. So every item here asks her
// to name the reason and to produce the domain and the range, not to evaluate
// anything.
//
// This is the one standard where "computed, never authored" looked like it
// might not hold -- a definition has no arithmetic to derive. It does hold:
// every item is built from a concrete relation, and functionhood, domain and
// range are all computed from that relation and re-derived by the verifier
// from the printed text. The vocabulary is what she supplies; the facts the
// key asserts are all computed. No hand-written answers anywhere.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, shuffle, trap, trapAnswer } from "../generate.ts";

const STANDARD = "8.F.A.1" as const;
const TIER: Tier = 2;

type Pair = readonly [number, number];

type Shape =
  | "function" // distinct inputs, distinct outputs
  | "repeated output" // a function, but an output repeats -- the named error
  | "not a function"; // an input repeats with two different outputs

type Presentation = "pairs" | "table" | "graph" | "verbal";

const SHAPES: readonly Shape[] = ["function", "repeated output", "not a function"];
const PRESENTATIONS: readonly Presentation[] = ["pairs", "table", "graph", "verbal"];

const QUESTION = [
  "Is this relation a function? Say yes or no, and name the test or the",
  "reason you used. Then list the domain and the range.",
].join("\n");

// ---------------------------------------------------------------------------
// facts computed from the relation itself
// ---------------------------------------------------------------------------

const unique = (xs: number[]): number[] =>
  [...new Set(xs)].sort((a, b) => a - b);

const domainOf = (pairs: readonly Pair[]): number[] =>
  unique(pairs.map(([x]) => x));

const rangeOf = (pairs: readonly Pair[]): number[] =>
  unique(pairs.map(([, y]) => y));

/** A relation is a function unless one input carries two different outputs. */
function isFunction(pairs: readonly Pair[]): boolean {
  const seen = new Map<number, number>();
  for (const [x, y] of pairs) {
    const existing = seen.get(x);
    if (existing !== undefined && existing !== y) return false;
    seen.set(x, y);
  }
  return true;
}

const set = (xs: number[]): string => `{${xs.join(", ")}}`;

function answerLine(pairs: readonly Pair[]): string {
  return `Function: ${isFunction(pairs) ? "yes" : "no"}. Domain: ${set(
    domainOf(pairs),
  )}. Range: ${set(rangeOf(pairs))}`;
}

// ---------------------------------------------------------------------------
// building relations
// ---------------------------------------------------------------------------

function buildPairs(shape: Shape, rng: RNG): Pair[] {
  const inputs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng).slice(0, 3);
  const outputs = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rng);

  if (shape === "not a function") {
    // One input used twice, with two different outputs.
    const repeated = inputs[0]!;
    const pairs: Pair[] = [
      [repeated, outputs[0]!],
      [inputs[1]!, outputs[1]!],
      [repeated, outputs[2]!],
      [inputs[2]!, outputs[3]!],
    ];
    return shuffle(pairs, rng);
  }

  if (shape === "repeated output") {
    // Distinct inputs, but two of them share an output. Still a function.
    const shared = outputs[0]!;
    const pairs: Pair[] = [
      [inputs[0]!, shared],
      [inputs[1]!, outputs[1]!],
      [inputs[2]!, shared],
    ];
    return shuffle(pairs, rng);
  }

  return shuffle(
    inputs.map((x, i) => [x, outputs[i]!] as Pair),
    rng,
  );
}

// ---------------------------------------------------------------------------
// presentations -- each prints the relation so it can be read back
// ---------------------------------------------------------------------------

function presentPairs(pairs: readonly Pair[]): string {
  return `  {${pairs.map(([x, y]) => `(${x}, ${y})`).join(", ")}}`;
}

function presentTable(pairs: readonly Pair[]): string {
  const width = (v: number) => String(v).length;
  const widths = pairs.map(([x, y]) => Math.max(width(x), width(y)));
  const row = (label: string, values: number[]) =>
    `  ${label} | ${values.map((v, i) => String(v).padStart(widths[i]!)).join(" | ")}`;
  return [
    row("input ", pairs.map(([x]) => x)),
    row("output", pairs.map(([, y]) => y)),
  ].join("\n");
}

function presentGraph(pairs: readonly Pair[]): string {
  return [
    "  A graph contains exactly these plotted points:",
    `  ${pairs.map(([x, y]) => `(${x}, ${y})`).join("   ")}`,
  ].join("\n");
}

/**
 * Two verbal templates with a fixed printed grammar, so the verifier can read
 * the rule back out of the sentence and rebuild the pairs independently.
 */
type Verbal =
  | { kind: "linear"; inputs: number[]; slope: number; intercept: number }
  | { kind: "roots"; inputs: number[] };

function presentVerbal(v: Verbal): string {
  if (v.kind === "linear") {
    return `  Each number in {${v.inputs.join(", ")}} is paired with ${v.slope} times the number, plus ${v.intercept}.`;
  }
  return `  Each number in {${v.inputs.join(", ")}} is paired with every number whose square equals it.`;
}

function verbalPairs(v: Verbal): Pair[] {
  if (v.kind === "linear") {
    return v.inputs.map((x) => [x, v.slope * x + v.intercept] as Pair);
  }
  // Both roots, so each input carries two outputs -- not a function.
  return v.inputs.flatMap((n) => {
    const r = Math.round(Math.sqrt(n));
    return [
      [n, r] as Pair,
      [n, -r] as Pair,
    ];
  });
}

/** Read a printed verbal relation back without consulting the generator. */
function parseVerbal(text: string): Verbal | null {
  const linear =
    /Each number in \{([\d, ]+)\} is paired with (\d+) times the number, plus (\d+)\./.exec(
      text,
    );
  if (linear) {
    return {
      kind: "linear",
      inputs: linear[1]!.split(",").map((s) => Number(s.trim())),
      slope: Number(linear[2]),
      intercept: Number(linear[3]),
    };
  }
  const roots =
    /Each number in \{([\d, ]+)\} is paired with every number whose square equals it\./.exec(
      text,
    );
  if (roots) {
    return {
      kind: "roots",
      inputs: roots[1]!.split(",").map((s) => Number(s.trim())),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

function work(pairs: readonly Pair[]): string[] {
  const steps: string[] = [
    "A relation is a function when every INPUT has exactly one output.",
    "So look for a repeated input, not a repeated output.",
  ];

  const counts = new Map<number, number[]>();
  for (const [x, y] of pairs) counts.set(x, [...(counts.get(x) ?? []), y]);

  if (isFunction(pairs)) {
    const repeatedOutput = rangeOf(pairs).length < pairs.length;
    steps.push("Every input appears once, so it IS a function.");
    if (repeatedOutput) {
      const shared = [...new Set(pairs.map(([, y]) => y))].find(
        (y) => pairs.filter(([, other]) => other === y).length > 1,
      );
      steps.push(
        `The output ${shared} appears twice. That is allowed -- two different inputs may share an output.`,
      );
    }
  } else {
    const [x, ys] = [...counts.entries()].find(
      ([, list]) => new Set(list).size > 1,
    )!;
    steps.push(
      `The input ${x} appears with ${ys.join(" and ")}. One input, two outputs -- NOT a function.`,
    );
  }

  steps.push(
    `Domain = the inputs, each listed once: ${set(domainOf(pairs))}`,
    `Range  = the outputs, each listed once: ${set(rangeOf(pairs))}`,
  );
  return steps;
}

function distractor(pairs: readonly Pair[]): string {
  const isFn = isFunction(pairs);
  const repeatedOutput = isFn && rangeOf(pairs).length < pairs.length;

  if (repeatedOutput) {
    const shared = rangeOf(pairs).find(
      (y) => pairs.filter(([, other]) => other === y).length > 1,
    );
    // OUTPUT_REPEAT in brief.md §5's taxonomy.
    return trap(
      "Function: no",
      `called it "not a function" because the output ${shared} repeats. A repeated OUTPUT is fine. Only a repeated INPUT with two different outputs breaks it`,
    );
  }
  if (!isFn) {
    return trap(
      "Function: yes",
      "did not check for a repeated input. Scan the inputs first, before anything else",
    );
  }
  // A clean function: the remaining common slip is swapping the two sets.
  return trap(
    `Domain: ${set(rangeOf(pairs))}. Range: ${set(domainOf(pairs))}`,
    "swapped them. Domain is the set of INPUTS; range is the set of OUTPUTS",
  );
}

function generate(rng: RNG): Item {
  const presentation = rng.pick(PRESENTATIONS);

  let pairs: Pair[];
  let body: string;

  if (presentation === "verbal") {
    // The linear template is always a function; the roots template never is.
    const relation: Verbal = rng.bool()
      ? {
          kind: "linear",
          inputs: shuffle([1, 2, 3, 4, 5, 6, 7, 8], rng)
            .slice(0, 3)
            .sort((a, b) => a - b),
          slope: rng.int(2, 5),
          intercept: rng.int(1, 9),
        }
      : {
          kind: "roots",
          inputs: shuffle([4, 9, 16, 25, 36, 49], rng)
            .slice(0, 3)
            .sort((a, b) => a - b),
        };
    pairs = verbalPairs(relation);
    body = presentVerbal(relation);
  } else {
    pairs = buildPairs(rng.pick(SHAPES), rng);
    body =
      presentation === "pairs"
        ? presentPairs(pairs)
        : presentation === "table"
          ? presentTable(pairs)
          : presentGraph(pairs);
  }

  const steps = work(pairs);
  if (presentation === "graph") {
    steps.splice(
      2,
      0,
      "On a graph this is the vertical line test: if any vertical line",
      "crosses the relation twice, one input has two outputs.",
    );
  }

  return {
    standard: STANDARD,
    prompt: `${QUESTION}\n\n${body}`,
    solution: answerLine(pairs),
    work: steps,
    trap: distractor(pairs),
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- re-derive functionhood, domain and range from the printed
// relation: "assert generated relation's actual functionhood
// matches the stated label"
// ---------------------------------------------------------------------------

const PAIR_RE = /\((-?\d+),\s*(-?\d+)\)/g;

/** Read the relation back out of whichever presentation was printed. */
function readRelation(prompt: string): Pair[] | null {
  const verbal = parseVerbal(prompt);
  if (verbal) return verbalPairs(verbal);

  const listed = [...prompt.matchAll(PAIR_RE)].map(
    ([, x, y]) => [Number(x), Number(y)] as Pair,
  );
  if (listed.length > 0) return listed;

  const inputs = /^\s*input\s*\|(.+)$/m.exec(prompt);
  const outputs = /^\s*output\s*\|(.+)$/m.exec(prompt);
  if (inputs && outputs) {
    const cells = (row: string) => row.split("|").map((c) => Number(c.trim()));
    const xs = cells(inputs[1]!);
    const ys = cells(outputs[1]!);
    if (xs.length !== ys.length || xs.some(Number.isNaN) || ys.some(Number.isNaN)) {
      return null;
    }
    return xs.map((x, i) => [x, ys[i]!] as Pair);
  }
  return null;
}

const SOLUTION_RE =
  /^Function: (yes|no)\. Domain: \{([-\d, ]*)\}\. Range: \{([-\d, ]*)\}$/;

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;

  const pairs = readRelation(item.prompt);
  if (!pairs || pairs.length < 2) return false;

  const claimed = SOLUTION_RE.exec(item.solution);
  if (!claimed) return false;

  // The label must match what the relation actually does.
  if ((claimed[1] === "yes") !== isFunction(pairs)) return false;

  const numbers = (csv: string) =>
    csv.trim() === "" ? [] : csv.split(",").map((s) => Number(s.trim()));
  const claimedDomain = numbers(claimed[2]!);
  const claimedRange = numbers(claimed[3]!);

  // Domain and range are the deduplicated, sorted inputs and outputs.
  if (claimedDomain.join(",") !== domainOf(pairs).join(",")) return false;
  if (claimedRange.join(",") !== rangeOf(pairs).join(",")) return false;

  // The prompt must actually ask for the vocabulary, not for an evaluation.
  if (!item.prompt.includes("domain") || !item.prompt.includes("range")) {
    return false;
  }

  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  if (wrong === `Function: ${claimed[1]}`) return false; // distractor agrees

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
