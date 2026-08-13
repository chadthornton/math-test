// 8.F.B.4 -- linear word problems.
//
// Item parameters. brief.md no longer carries an item-generation section --
// it became this code -- so this block is the surviving record of it:
//   form:    story -> define variable -> write equation -> solve -> sentence
//            with units
//   require: rate + starting value clearly extractable
//   error:   attaches rate to wrong slot; stops at the number; omits units
//
// Error signatures (brief.md §5): RATE_SLOT, STOPPED_AT_NUMBER, NO_UNITS, NO_VAR_DEF
// Tier 4: the bottom of brief.md §3's graph -- it requires every node above.
//
// This is the one standard where the PROMPT is a template rather than a
// computed string -- a story has to be written by a human once. Everything the
// key asserts is still computed: the numbers, the model equation, the solution
// and the sentence all come from the same parameters. And the verifier does
// what it can about the prose: it checks that every number in the model
// actually appears in the story, which catches a template that drops or
// renames a value.

import type { Generator, Item, Tier } from "../generate.ts";
import { RNG, checkCommon, trap, trapAnswer } from "../generate.ts";
import { renderConstant, sidesAgree } from "../linear.ts";

const STANDARD = "8.F.B.4" as const;
const TIER: Tier = 4;

interface Story {
  /** Builds the story text. Every number used must be one of the parameters. */
  text(rate: number, start: number, target: number): string;
  variable: string;
  unit: string;
  /** Rates are per-something; this bounds them so the story stays plausible. */
  rateRange: readonly [number, number];
  startRange: readonly [number, number];
  /** Negative rate: the quantity shrinks. */
  decreasing?: boolean;
  sentence(value: number): string;
}

const STORIES: readonly Story[] = [
  {
    text: (rate, start, target) =>
      `A gym charges a $${start} joining fee, then $${rate} per month.\nAfter how many months has a member paid $${target} in total?`,
    variable: "m",
    unit: "months",
    rateRange: [10, 30],
    startRange: [20, 60],
    sentence: (v) => `It takes ${v} months.`,
  },
  {
    text: (rate, start, target) =>
      `Maya has $${start} saved and adds $${rate} every week.\nAfter how many weeks will she have $${target}?`,
    variable: "w",
    unit: "weeks",
    rateRange: [5, 25],
    startRange: [15, 70],
    sentence: (v) => `It takes ${v} weeks.`,
  },
  {
    text: (rate, start, target) =>
      `A seedling is ${start} cm tall and grows ${rate} cm each week.\nAfter how many weeks is it ${target} cm tall?`,
    variable: "w",
    unit: "weeks",
    rateRange: [2, 9],
    startRange: [4, 20],
    sentence: (v) => `It takes ${v} weeks.`,
  },
  {
    text: (rate, start, target) =>
      `A taxi charges a $${start} flat fee plus $${rate} per mile.\nHow many miles does a $${target} fare cover?`,
    variable: "d",
    unit: "miles",
    rateRange: [2, 8],
    startRange: [3, 12],
    sentence: (v) => `The fare covers ${v} miles.`,
  },
  {
    text: (rate, start, target) =>
      `A tank holds ${start} liters and drains ${rate} liters per minute.\nAfter how many minutes does it hold ${target} liters?`,
    variable: "t",
    unit: "minutes",
    rateRange: [3, 12],
    startRange: [80, 200],
    decreasing: true,
    sentence: (v) => `It takes ${v} minutes.`,
  },
];

function generate(rng: RNG): Item {
  const story = rng.pick(STORIES);
  const magnitude = rng.int(story.rateRange[0], story.rateRange[1]);
  const rate = story.decreasing ? -magnitude : magnitude;
  let start = rng.int(story.startRange[0], story.startRange[1]);
  // Equal rate and starting value would make the swapped-slot distractor
  // identical to the correct equation.
  if (start === magnitude) start += 1;
  const answer = rng.int(3, 12);
  const target = rate * answer + start;

  const v = story.variable;
  const signed = rate < 0 ? `-${Math.abs(rate)}` : String(rate);
  const equation = `${signed}${v} + ${start} = ${target}`;

  const work = [
    `Let ${v} = the number of ${story.unit}.`,
    `Starting value: ${start}. That is the part that does not change.`,
    `Rate: ${rate} per ${story.unit.replace(/s$/, "")}. That is what multiplies ${v}.`,
    `Equation:  ${equation}`,
    `Subtract ${start} from both sides:  ${signed}${v} = ${target - start}`,
    `Divide by ${rate}:  ${v} = ${answer}`,
    `Answer in a sentence, with units: ${story.sentence(answer)}`,
  ];

  // Both named errors, as computed distractors.
  //
  // The wrong-slot error is expressed as the EQUATION she would write, not as
  // a number. That is how it actually shows up in a word problem, and it is
  // always available -- solving the swapped equation almost never lands on a
  // whole number, so a numeric version of this distractor would essentially
  // never appear.
  const distractor = rng.bool()
    ? trap(
        `${start}${v}${renderConstant(rate)} = ${target}`,
        `attached the rate to the wrong slot -- wrote the starting value ${start} as the rate. The rate is the part that repeats, so it is what multiplies ${v}`,
      )
    : trap(
        String(answer),
        `stopped at the number. The question asks how many ${story.unit}, so the answer needs a unit and a sentence: "${story.sentence(answer)}"`,
      );

  return {
    standard: STANDARD,
    prompt: `${story.text(Math.abs(rate), start, target)}\n\nDefine your variable, write an equation, solve it, and answer in a\nsentence with units.`,
    // The story. The instruction is the same on every item and says nothing
    // about which problem this was.
    logLabel: story.text(Math.abs(rate), start, target).replace(/\n/g, " "),
    solution: `Equation: ${equation}\n${v} = ${answer}\nSentence: ${story.sentence(answer)}`,
    work,
    trap: distractor,
    tier: TIER,
    seed: rng.seed,
  };
}

// ---------------------------------------------------------------------------
// verification -- substitute the solution into the model equation
// ---------------------------------------------------------------------------

const SOLUTION_RE =
  /^Equation: (.+)\n([a-z]) = (-?\d+)\nSentence: (.+)$/;

function verify(item: Item): boolean {
  if (!checkCommon(item, STANDARD, TIER)) return false;

  const claimed = SOLUTION_RE.exec(item.solution);
  if (!claimed) return false;
  const [, equation, variable, rawValue, sentence] = claimed;
  const value = Number(rawValue);

  // Substitute the solution into the model equation.
  if (!sidesAgree(equation!, { [variable!]: value })) return false;

  // The equation must actually use the variable it claims to solve for.
  if (!equation!.includes(variable!)) return false;

  // The sentence carries the number AND the unit -- both named errors.
  if (!sentence!.includes(String(value))) return false;
  if (!/\b(months|weeks|miles|minutes)\b/.test(sentence!)) return false;

  // The prompt must ask for the sentence and the units, not just a number.
  if (!/units/.test(item.prompt)) return false;

  // The story has to contain every number the model uses. This is the one
  // check available against a prose template silently losing a value.
  const inStory = new Set(
    (item.prompt.match(/\d+/g) ?? []).map(Number),
  );
  for (const number of equation!.match(/\d+/g) ?? []) {
    if (!inStory.has(Number(number))) return false;
  }

  const wrong = trapAnswer(item.trap);
  if (wrong === null) return false;
  // The distractor is either a different number, or the bare number with no
  // units -- which is a real wrong answer even though it reads as correct.
  if (wrong === item.solution) return false;

  return true;
}

export const generator: Generator = {
  standard: STANDARD,
  tier: TIER,
  generate,
  verify,
};

export default generator;
