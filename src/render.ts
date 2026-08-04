// Markdown out. Build order step 2 (spec.md).
//
// Target format is the existing sheets: fenced code blocks for all math,
// one item per block, a rule between items. Monospace ASCII only -- no LaTeX
// (spec.md non-goals).
//
// The student sheet does NOT label items with their standard. brief.md §4:
// a heading that names the procedure is exactly what blocked practice trains,
// and the retake is interleaved. Standards appear on the key only.

import type { Item, Session } from "./generate.ts";

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
    out.push(
      `**${i + 1}.**`,
      "",
      fence([item.prompt, "", "Answer: ______________"].join("\n")),
      "",
      RULE,
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}

export function renderKey(session: Session): string {
  const out: string[] = [
    `# Answer Key -- ${session.date}`,
    "",
    meta(session),
    "",
    "Every solution below was computed by the generator and re-verified against",
    "the printed problem, not written out by hand.",
    "",
    "Each entry ends with the likely wrong answer and what it means. If she",
    "produces that answer, log the raw error -- see brief.md, error log.",
    "",
    RULE,
    "",
  ];

  session.items.forEach((item, i) => {
    out.push(
      `**${i + 1}.** \`${item.standard}\` | tier ${item.tier} | seed \`${item.seed}\``,
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
      RULE,
      "",
    );
  });

  return out.join("\n").trimEnd() + "\n";
}

/** Compact one-line-per-item view, for checking a run at a glance. */
export function renderInline(items: Item[]): string {
  return items
    .map((item, i) => {
      const expression = item.prompt.replace(/^\S+\s+/, "");
      return `${String(i + 1).padStart(2)}.  ${expression.padEnd(22)} =  ${item.solution.padStart(4)}`;
    })
    .join("\n");
}
