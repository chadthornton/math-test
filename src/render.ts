// Markdown out.
//
// Target format is the existing sheets: fenced code blocks for all math,
// one item per block, a rule between items. Monospace ASCII only -- no LaTeX
// (a standing non-goal -- see CLAUDE.md).
//
// The student sheet does NOT label items with their standard. brief.md §4:
// a heading that names the procedure is exactly what blocked practice trains,
// and the retake is interleaved. Standards appear on the key only.

import type { Session } from "./generate.ts";

const RULE = "---";

function fence(body: string): string {
  return ["```", body, "```"].join("\n");
}

function indent(lines: string[], by = "  "): string[] {
  return lines.map((line) => (line.length > 0 ? by + line : line));
}

function meta(session: Session): string {
  const n = session.items.length;
  return `Seed \`${session.seed}\` | ${n} item${n === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------

export function renderSet(session: Session): string {
  const out: string[] = [
    `# Practice Set -- ${session.date}`,
    "",
    `${meta(session)} | **no calculator**`,
    "",
    "Show your work. These are not grouped by type -- read each one and decide",
    "which move applies before you make it.",
    "",
    RULE,
    "",
  ];

  session.items.forEach((item, i) => {
    // A multi-line prompt asks for more than one thing -- 8.F.A.1 wants a
    // yes/no, a reason, a domain and a range. One ruled line is not enough.
    const lines = item.prompt.includes("\n") ? 3 : 1;
    const answer = Array.from({ length: lines }, (_, n) =>
      n === 0 ? "Answer: ______________" : "        ______________",
    );
    out.push(
      `**${i + 1}.**`,
      "",
      fence([item.prompt, "", ...answer].join("\n")),
      "",
      RULE,
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}

export interface KeyOptions {
  /** Seeds of items rebuilt from the log, so the key can mark them. */
  recall?: ReadonlySet<number>;
}

/**
 * A paste-ready log.md line, with the seed already filled in. The seed is what
 * makes a missed problem reconstructible later -- see log.md. Everything is
 * pre-filled except what she wrote and how it went.
 */
function logLine(
  item: { standard: string; prompt: string; seed: number; logLabel?: string },
  date: string,
): string {
  // A module sets logLabel when its prompt spans lines, because only the
  // module knows which part is the problem. Otherwise: single line, strip
  // the directive. Directives can be several words ("Solve, then describe
  // the graph:"), so match up to the colon rather than one word.
  const raw =
    item.logLabel ?? item.prompt.replace(/^[^:\n]*:\s*/, "");
  const problem = raw
    .replace(/\s+/g, " ") // collapse any wrapping
    .replace(/\|/g, "/") // a pipe would break the field split
    .trim();
  const short = problem.length > 44 ? `${problem.slice(0, 41)}...` : problem;
  return `log: ${date} | ${item.standard} | ${short} |  |  | ${item.seed}`;
}

export function renderKey(session: Session, opts: KeyOptions = {}): string {
  const out: string[] = [
    `# Answer Key -- ${session.date}`,
    "",
    meta(session),
    "",
    "Every solution below was computed by the generator and re-verified against",
    "the printed problem, not written out by hand.",
    "",
    "Each entry ends with the likely wrong answer and what it means. If she",
    "produces that answer, copy the `log:` line into log.md and fill in the two",
    "blank fields -- what she wrote, and wrong / stuck / slow. The seed is",
    "already there, and it is what lets a later session re-drill this exact",
    "problem rather than another one like it.",
    "",
    RULE,
    "",
  ];

  session.items.forEach((item, i) => {
    const isRecall = opts.recall?.has(item.seed) ?? false;
    out.push(
      `**${i + 1}.** \`${item.standard}\` | tier ${item.tier} | seed \`${item.seed}\`` +
        (isRecall ? " | **spaced recall -- she missed this one before**" : ""),
      "",
      fence(
        [
          item.prompt,
          "",
          ...indent(item.work),
          "",
          `  ANSWER:  ${item.solution}`,
        ].join("\n"),
      ),
      "",
      `**If she wrote** ${item.trap}.`,
      "",
      fence(logLine(item, session.date)),
      "",
      RULE,
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}
