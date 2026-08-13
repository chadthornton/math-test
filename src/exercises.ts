// The three exercise types from brief.md §4 that are not an interleaved set:
// the faded example, the reminder sheet, and the diagnostic sweep.
//
// brief.md §4 is explicit that these are distinct instruments -- "each is a
// separate render mode for the generator" -- so they live here rather than
// being options on renderSet().

import type { Item, Standard } from "./generate.ts";
import { RNG, shuffle } from "./generate.ts";
import { REMINDERS, rankTraps } from "./reminders.ts";

const RULE = "---";

const fence = (body: string): string => ["```", body, "```"].join("\n");
const blank = (n = 22): string => "_".repeat(n);

/**
 * Steps up to but not including the first one that gives the answer away.
 * "Worked down to the final step" means the final step is missing, and for
 * several standards the answer appears two or three lines from the end --
 * 7.EE.B.4 states `x < -8` and then describes its graph.
 */
function beforeTheAnswer(work: readonly string[], solution: string): string[] {
  const reveals = (step: string): boolean => {
    const t = step.trim();
    return t.length > 0 && (step.includes(solution) || solution.includes(t));
  };
  const cut = work.findIndex(reveals);
  return cut <= 0 ? [] : work.slice(0, cut);
}

/** The leading prose of a worked solution: the decisions, before the algebra. */
function reasoning(work: readonly string[]): string[] {
  const out: string[] = [];
  for (const step of work) {
    if (step.includes("=") || step.startsWith("  ")) break;
    out.push(step);
  }
  return out.length > 0 ? out : [work[0] ?? ""];
}

// ---------------------------------------------------------------------------
// Faded example -- brief.md §6
//
//   LEVEL 1  fully worked, every step, reasoning shown
//   LEVEL 2  worked down to the final step -- she fills it in
//   LEVEL 3  setup given, all solving steps blank
//   LEVEL 4  problem only
//   LEVEL 5  same type, buried in a mixed unlabeled set
//
// All five are the same problem type with different numbers. The fade is the
// scaffold. §6 also notes that step 5 is the transfer test and the one that
// gets skipped, which is why it is on the same sheet rather than optional.
// ---------------------------------------------------------------------------

export interface FadedSheet {
  standard: Standard;
  ladder: Item[]; // four items, levels 1-4
  mixed: Item[]; // level 5: unlabeled mixed set containing one of the type
  date: string;
  seed: number;
}

export function renderFaded(sheet: FadedSheet): string {
  const [one, two, three, four] = sheet.ladder;
  const out: string[] = [
    `# Faded Example -- ${sheet.date}`,
    "",
    `Seed \`${sheet.seed}\``,
    "",
    "Five versions of the same problem type. Work them in order, top to bottom.",
    "The help disappears one step at a time -- that is the point, so do not skip",
    "ahead and do not look back up the page.",
    "",
    RULE,
    "",
    "## Level 1 -- fully worked",
    "",
    "Read it. Do not copy it. Notice the DECISIONS, not just the arithmetic.",
    "",
    fence(
      [one!.prompt, "", ...one!.work.map((w) => `  ${w}`), "", `  ANSWER:  ${one!.solution}`].join("\n"),
    ),
    "",
    RULE,
    "",
    "## Level 2 -- the last step is yours",
    "",
    fence(
      [
        two!.prompt,
        "",
        ...(beforeTheAnswer(two!.work, two!.solution).length > 0
          ? beforeTheAnswer(two!.work, two!.solution)
          : reasoning(two!.work)
        ).map((w) => `  ${w}`),
        `  ${blank(34)}`,
        "",
        `  ANSWER:  ${blank(12)}`,
      ].join("\n"),
    ),
    "",
    RULE,
    "",
    "## Level 3 -- the thinking is given, the solving is yours",
    "",
    fence(
      [
        three!.prompt,
        "",
        ...reasoning(three!.work).map((w) => `  ${w}`),
        "",
        `  ${blank(34)}`,
        `  ${blank(34)}`,
        `  ${blank(34)}`,
        "",
        `  ANSWER:  ${blank(12)}`,
      ].join("\n"),
    ),
    "",
    RULE,
    "",
    "## Level 4 -- on your own",
    "",
    fence(
      [
        four!.prompt,
        "",
        `  ${blank(34)}`,
        `  ${blank(34)}`,
        `  ${blank(34)}`,
        `  ${blank(34)}`,
        "",
        `  ANSWER:  ${blank(12)}`,
      ].join("\n"),
    ),
    "",
    RULE,
    "",
    "## Level 5 -- find it yourself",
    "",
    "One of these is the same type you just practised. The rest are not, and",
    "nothing is labelled. Deciding which procedure applies is the whole test.",
    "",
  ];

  sheet.mixed.forEach((item, i) => {
    out.push(
      `**${i + 1}.**`,
      "",
      fence([item.prompt, "", `Answer: ${blank(14)}`].join("\n")),
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}

export function renderFadedKey(sheet: FadedSheet): string {
  const out: string[] = [
    `# Faded Example -- Key -- ${sheet.date}`,
    "",
    `\`${sheet.standard}\` · seed \`${sheet.seed}\``,
    "",
    RULE,
    "",
  ];

  sheet.ladder.forEach((item, i) => {
    out.push(
      `**Level ${i + 1}.** seed \`${item.seed}\``,
      "",
      fence(
        [item.prompt, "", ...item.work.map((w) => `  ${w}`), "", `  ANSWER:  ${item.solution}`].join("\n"),
      ),
      "",
      `**If she wrote** ${item.trap}.`,
      "",
      RULE,
      "",
    );
  });

  out.push("## Level 5 -- the mixed set", "");
  sheet.mixed.forEach((item, i) => {
    const target = item.standard === sheet.standard ? "  <-- the one she practised" : "";
    out.push(`${i + 1}. \`${item.standard}\`  ANSWER: ${item.solution}${target}`);
  });

  return out.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// Reminder sheet -- brief.md §5. Read before working, not during.
// ---------------------------------------------------------------------------

export function renderReminder(
  standard: Standard,
  example: Item,
  hitSignatures: ReadonlySet<string> = new Set(),
): string {
  const reminder = REMINDERS[standard];
  if (!reminder) throw new Error(`no reminder sheet authored for ${standard}`);

  const traps = rankTraps(reminder.traps, hitSignatures);

  const out: string[] = [
    `# ${reminder.title}`,
    "",
    "Read this before you start. Do not keep it beside you while you work --",
    "the point is to have it in your head, not on the desk.",
    "",
    RULE,
    "",
    "## RULE",
    "",
    ...reminder.rule.map((r) => `- ${r}`),
    "",
    "## SEQUENCE",
    "",
    ...reminder.sequence.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## EXAMPLE",
    "",
    fence(
      [example.prompt, "", ...example.work.map((w) => `  ${w}`), "", `  ANSWER:  ${example.solution}`].join("\n"),
    ),
    "",
    "## TRAPS",
    "",
  ];

  if (hitSignatures.size > 0) {
    out.push("Ones you have actually hit are first, and marked.", "");
  }

  for (const trap of traps) {
    const hit = hitSignatures.has(trap.signature);
    out.push(`- ${hit ? "**>> " : "`"}${trap.signature}${hit ? " <<**" : "`"} — ${trap.text}`);
  }

  return out.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// Diagnostic sweep -- brief.md §4: MC, many standards, fast, distractors
// encode misconceptions so the choice she makes identifies the error.
//
// Only ONE distractor per item is diagnostic -- the item's own computed trap.
// The others are answers to sibling items of the same standard, which makes
// the question a real choice without pretending to more diagnosis than there
// is. The key says which is which.
// ---------------------------------------------------------------------------

export interface SweepQuestion {
  item: Item;
  options: string[];
  correctIndex: number;
  trapIndex: number;
}

const LETTERS = ["A", "B", "C", "D"];

/** Build questions from a pool, drawing filler options from siblings. */
export function buildSweep(items: readonly Item[], rng: RNG): SweepQuestion[] {
  return items.map((item) => {
    const trapAnswer = /^`([^`]+)`/.exec(item.trap)?.[1] ?? "";
    const siblings = items
      .filter((o) => o.standard === item.standard && o.seed !== item.seed)
      .map((o) => o.solution)
      .filter((s) => s !== item.solution && s !== trapAnswer);

    const fillers = [...new Set(siblings)].slice(0, 2); // -> up to 4 options
    const options = shuffle([item.solution, trapAnswer, ...fillers], rng);
    return {
      item,
      options,
      correctIndex: options.indexOf(item.solution),
      trapIndex: options.indexOf(trapAnswer),
    };
  });
}

export function renderSweep(questions: SweepQuestion[], date: string, seed: number): string {
  const out: string[] = [
    `# Diagnostic Sweep -- ${date}`,
    "",
    `Seed \`${seed}\` · ${questions.length} questions · **no calculator**`,
    "",
    "Fast. Circle one. If you cannot see it in about thirty seconds, circle your",
    "best guess and move on -- this is finding out what to work on, not a test.",
    "",
    RULE,
    "",
  ];

  questions.forEach((q, i) => {
    out.push(
      `**${i + 1}.**`,
      "",
      fence(
        [
          q.item.logLabel ?? q.item.prompt,
          "",
          ...q.options.map((o, n) => `   ${LETTERS[n]}.  ${o}`),
        ].join("\n"),
      ),
      "",
      RULE,
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}

export function renderSweepKey(questions: SweepQuestion[], date: string, seed: number): string {
  const out: string[] = [
    `# Diagnostic Sweep -- Key -- ${date}`,
    "",
    `Seed \`${seed}\``,
    "",
    "Only the marked option is diagnostic: choosing it identifies a specific",
    "misconception. The other wrong options are answers to other questions of",
    "the same type and mean nothing in particular.",
    "",
    RULE,
    "",
  ];

  questions.forEach((q, i) => {
    out.push(
      `**${i + 1}.** \`${q.item.standard}\` · correct: **${LETTERS[q.correctIndex]}** · ` +
        `diagnostic wrong answer: **${LETTERS[q.trapIndex]}**`,
      "",
      `- **${LETTERS[q.trapIndex]}** ${q.item.trap.replace(/^`[^`]*` -- /, "means she ")}.`,
      "",
      fence(`log: ${date} | ${q.item.standard} | ${q.item.logLabel ?? q.item.prompt.replace(/^[^:\n]*:\s*/, "")} |  |  | ${q.item.seed}`),
      "",
      RULE,
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}
