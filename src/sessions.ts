// sessions.md -- the index that makes a printed set findable again.
//
// A seed alone does not identify a set. `--count` and `--tier` change the
// items too, so `grade --seed 7` is not enough to know what she actually
// worked. This records the whole invocation, one line per emitted set.
//
// It is durable state, like log.md: append-only, never rewritten, not
// gitignored. Everything else in out/ is disposable because it regenerates
// from a line in here.
//
// The fingerprint is the part that matters. It is a hash over the item seeds,
// so `grade` can regenerate a set, compare, and REFUSE to log if a generator
// change means the regenerated set is no longer what she held. Silently
// attaching her answers to different problems would be worse than losing the
// entry.

export const SESSIONS_PATH = "sessions.md";

export const SESSIONS_MARKER = "<!-- Sessions below this line. -->";

export const SESSIONS_HEADER = `# Session index

One line per emitted set. Append-only -- never edit or reorder, and never let
a tool rewrite a past line.

A set is identified by its whole invocation, not by its seed: \`--count\` and
\`--tier\` change the items too. \`grade\` reads this file to find the set you
are grading, so if a line is missing the set cannot be graded without
retyping the invocation by hand.

\`\`\`
DATE | COMMAND | seed N | count N | SCOPE | fp XXXXXXXX
\`\`\`

\`SCOPE\` is \`tier 1,2\`, or \`standard 7.NS.A.1\`, or \`-\`.

\`fp\` is a fingerprint over the item seeds. \`grade\` regenerates the set and
compares. A mismatch means a generator changed since the sheet was printed,
and grading is refused rather than logging her answers against problems she
never saw.

---

${SESSIONS_MARKER}
`;

export interface SessionRecord {
  date: string;
  command: string;
  seed: number;
  count: number;
  /** `tier 1,2` or `standard 7.NS.A.1` or `-`. */
  scope: string;
  fingerprint: string;
}

/**
 * FNV-1a over the item seeds. Not cryptographic -- it only has to notice that
 * a regenerated set differs from the one that was printed.
 */
export function fingerprint(items: readonly { seed: number }[]): string {
  let hash = 0x811c9dc5;
  for (const char of items.map((i) => i.seed).join(",")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function formatRecord(record: SessionRecord): string {
  return [
    record.date,
    record.command,
    `seed ${record.seed}`,
    `count ${record.count}`,
    record.scope,
    `fp ${record.fingerprint}`,
  ].join(" | ");
}

export function parseSessions(text: string): SessionRecord[] {
  const marker = text.indexOf(SESSIONS_MARKER);
  const body = marker === -1 ? text : text.slice(marker + SESSIONS_MARKER.length);

  const out: SessionRecord[] = [];
  for (const line of body.split("\n")) {
    const fields = line.split("|").map((f) => f.trim());
    if (fields.length !== 6) continue;
    const seed = /^seed (\d+)$/.exec(fields[2]!);
    const count = /^count (\d+)$/.exec(fields[3]!);
    const fp = /^fp ([0-9a-f]{8})$/.exec(fields[5]!);
    if (!seed || !count || !fp) continue;
    out.push({
      date: fields[0]!,
      command: fields[1]!,
      seed: Number(seed[1]),
      count: Number(count[1]),
      scope: fields[4]!,
      fingerprint: fp[1]!,
    });
  }
  return out;
}

/** The invocation that reproduces a recorded set, printed on the answer key. */
export function invocationOf(record: SessionRecord): string {
  const parts = [
    `bun run ${record.command}`,
    `--seed ${record.seed}`,
    `--count ${record.count}`,
  ];
  if (record.scope !== "-") {
    const [flag, ...rest] = record.scope.split(" ");
    parts.push(`--${flag} ${rest.join(" ")}`);
  }
  parts.push(`--date ${record.date}`);
  return parts.join(" ");
}
