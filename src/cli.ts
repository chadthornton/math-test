// CLI.
//
//   bun run gen     --standards 7.NS.A.1,8.EE.A.1 --count 10 --seed 42
//   bun run session --tier 1,2 --count 12 --seed 7
//   bun run session --from-log --count 12
//   bun run drill    --standard 7.NS.A.1 --count 20
//   bun run faded    --standard 7.EE.B.4 --seed 3      brief.md §6 ladder
//   bun run reminder --standard 7.EE.B.4               brief.md §5 sheet
//   bun run sweep    --count 10 --seed 4               brief.md §4 MC triage
//
// All commands emit two files to out/: the set and the key.

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  RNG,
  generateItems,
  shuffle,
  type Item,
  type Session,
  type Standard,
  type Tier,
} from "./generate.ts";
import { assemble, misses, parseLog, unknownSignatures } from "./assemble.ts";
import {
  buildSweep,
  renderFaded,
  renderFadedKey,
  renderReminder,
  renderSweep,
  renderSweepKey,
} from "./exercises.ts";
import { renderKey, renderSet } from "./render.ts";
import {
  SESSIONS_HEADER,
  SESSIONS_PATH,
  fingerprint,
  formatRecord,
  invocationOf,
  type SessionRecord,
} from "./sessions.ts";
import { BUILT, generatorFor } from "./registry.ts";
import { isKnown, tokensIn } from "./signatures.ts";

const LOG_PATH = "log.md";

interface Args {
  command: string;
  flags: Map<string, string>;
  bare: Set<string>;
}

function parseArgs(argv: string[]): Args {
  const [command = "session", ...rest] = argv;
  const flags = new Map<string, string>();
  const bare = new Set<string>();

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      bare.add(key);
    } else {
      flags.set(key, next);
      i++;
    }
  }
  return { command, flags, bare };
}

function integer(raw: string | undefined, fallback: number, label: string): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${label} must be a non-negative integer`);
  }
  return value;
}

function list(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Write one or two documents to out/, honouring --out and --no-write. */
function writeOut(args: Args, stem: string, set: string, key?: string): void {
  if (args.bare.has("no-write")) return;
  const outDir = args.flags.get("out") ?? "out";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${stem}.md`), set);
  process.stderr.write(`\nwrote ${join(outDir, `${stem}.md`)}\n`);
  if (key !== undefined) {
    writeFileSync(join(outDir, `${stem}-key.md`), key);
    process.stderr.write(`wrote ${join(outDir, `${stem}-key.md`)}\n`);
  }
}

/**
 * Append one line to sessions.md. This is what makes a printed set findable
 * again -- a seed alone does not identify it, since --count and --tier change
 * the items too.
 */
function recordSession(record: SessionRecord): void {
  if (!existsSync(SESSIONS_PATH)) writeFileSync(SESSIONS_PATH, SESSIONS_HEADER);
  appendFileSync(SESSIONS_PATH, `${formatRecord(record)}\n`);
  process.stderr.write(`indexed in ${SESSIONS_PATH}\n`);
}

function emit(
  session: Session,
  slug: string,
  args: Args,
  scope: string,
  command: string,
  recall?: ReadonlySet<number>,
): void {
  const record: SessionRecord = {
    date: session.date,
    command,
    seed: session.seed,
    count: session.items.length,
    scope,
    fingerprint: fingerprint(session.items),
  };
  const set = renderSet(session);
  const key = renderKey(session, { recall, invocation: invocationOf(record) });
  process.stdout.write(set + "\n" + key);

  if (args.bare.has("no-write")) return;
  const outDir = args.flags.get("out") ?? "out";
  mkdirSync(outDir, { recursive: true });
  const stem = `${session.date}-${slug}-seed${session.seed}`;
  writeFileSync(join(outDir, `${stem}.md`), set);
  writeFileSync(join(outDir, `${stem}-key.md`), key);
  process.stderr.write(
    `\nwrote ${join(outDir, `${stem}.md`)}\nwrote ${join(outDir, `${stem}-key.md`)}\n`,
  );
  recordSession(record);
}

function loadMisses() {
  if (!existsSync(LOG_PATH)) {
    process.stderr.write(`no ${LOG_PATH} found; continuing without spaced recall\n`);
    return [];
  }
  const entries = parseLog(readFileSync(LOG_PATH, "utf8"));
  const found = misses(entries);
  process.stderr.write(
    `${LOG_PATH}: ${entries.length} entr(ies), ${found.length} miss(es)\n`,
  );
  // A typo'd signature is not a miss, and would otherwise vanish silently.
  const unknown = unknownSignatures(entries);
  if (unknown.length > 0) {
    process.stderr.write(
      `warning: not in brief.md §5's taxonomy: ${unknown.join(", ")}\n`,
    );
  }
  return found;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const seed = integer(args.flags.get("seed"), 42, "seed");
  const date = args.flags.get("date") ?? new Date().toISOString().slice(0, 10);

  switch (args.command) {
    case "gen": {
      // One or more named standards, evenly split, no assembly rules applied.
      const count = integer(args.flags.get("count"), 10, "count");
      const names = list(args.flags.get("standards"));
      const standards = (names.length > 0 ? names : ["7.NS.A.1"]) as Standard[];
      const rng = new RNG(seed);
      let rejected = 0;

      const batches = standards.map((s) =>
        generateItems(generatorFor(s), rng, Math.ceil(count / standards.length), {
          onReject: () => rejected++,
        }),
      );
      const items = [];
      for (let i = 0; items.length < count; i++) {
        for (const batch of batches) {
          if (batch[i] && items.length < count) items.push(batch[i]!);
        }
      }

      emit(
        { seed, date, items },
        standards.join("+"),
        args,
        `standards ${standards.join(",")}`,
        "gen",
      );
      process.stderr.write(`${items.length} items verified, ${rejected} rejected\n`);
      return;
    }

    case "session": {
      const count = integer(args.flags.get("count"), 13, "count");
      const tiers = list(args.flags.get("tier")).map(Number) as Tier[];
      const fromLog = args.bare.has("from-log");
      const result = assemble({
        seed,
        date,
        count,
        tiers: tiers.length > 0 ? tiers : undefined,
        standards: (list(args.flags.get("standards")) as Standard[]).length
          ? (list(args.flags.get("standards")) as Standard[])
          : undefined,
        missed: fromLog ? loadMisses() : undefined,
      });

      const scope = tiers.length > 0 ? `tier ${tiers.join(",")}` : "-";
      emit(result.session, "session", args, scope, "session", result.recalled);
      const used = [...new Set(result.session.items.map((i) => i.standard))];
      process.stderr.write(
        `${result.session.items.length} items verified, ${result.rejected} rejected\n` +
          `standards: ${used.join(", ")}\n`,
      );
      for (const note of result.notes) process.stderr.write(`note: ${note}\n`);
      return;
    }

    case "drill": {
      // Single standard, so the no-adjacent-repeats rule does not apply.
      const count = integer(args.flags.get("count"), 20, "count");
      const name = args.flags.get("standard");
      if (!name) throw new Error("drill needs --standard");
      let rejected = 0;
      const items = generateItems(generatorFor(name), new RNG(seed), count, {
        onReject: () => rejected++,
      });
      emit({ seed, date, items }, `drill-${name}`, args, `standard ${name}`, "drill");
      process.stderr.write(`${items.length} items verified, ${rejected} rejected\n`);
      return;
    }

    case "faded": {
      // brief.md §6: five levels, same type, different numbers.
      const name = args.flags.get("standard");
      if (!name) throw new Error("faded needs --standard");
      const gen = generatorFor(name);
      const rng = new RNG(seed);
      const ladder = generateItems(gen, rng, 4);

      // Level 5: one item of the type, hidden among five that are not.
      const others = BUILT.filter((s) => s !== name);
      const decoys = others
        .slice(0, 5)
        .map((s) => generateItems(generatorFor(s), rng, 1)[0]!);
      const mixed = shuffle([generateItems(gen, rng, 1)[0]!, ...decoys], rng);

      const sheet = { standard: name as Standard, ladder, mixed, date, seed };
      const set = renderFaded(sheet);
      const key = renderFadedKey(sheet);
      process.stdout.write(set + "\n" + key);
      writeOut(args, `${date}-faded-${name}-seed${seed}`, set, key);
      return;
    }

    case "reminder": {
      // brief.md §5. Traps she has hit are promoted; see rankTraps().
      const name = args.flags.get("standard");
      if (!name) throw new Error("reminder needs --standard");
      const gen = generatorFor(name);
      const example = generateItems(gen, new RNG(seed), 1)[0]!;

      const hit = new Set<string>();
      if (args.bare.has("from-log") && existsSync(LOG_PATH)) {
        for (const entry of misses(parseLog(readFileSync(LOG_PATH, "utf8")))) {
          if (entry.standard === name) {
            for (const t of tokensIn(entry.outcome)) if (isKnown(t)) hit.add(t);
          }
        }
        process.stderr.write(`${hit.size} trap(s) promoted from log.md\n`);
      }

      const sheet = renderReminder(name as Standard, example, hit);
      process.stdout.write(sheet);
      writeOut(args, `${date}-reminder-${name}`, sheet);
      return;
    }

    case "sweep": {
      // brief.md §4: MC, many standards, fast, distractors encode misconceptions.
      const count = integer(args.flags.get("count"), 10, "count");
      const rng = new RNG(seed);
      const pool: Item[] = [];
      // Four per standard so every question has siblings to draw options from;
      // with fewer, some questions came out with only two choices.
      for (const s of BUILT) pool.push(...generateItems(generatorFor(s), rng, 4));
      const chosen = shuffle(pool, rng).slice(0, count);
      const questions = buildSweep(chosen, rng);

      const set = renderSweep(questions, date, seed);
      const key = renderSweepKey(questions, date, seed);
      process.stdout.write(set + "\n" + key);
      writeOut(args, `${date}-sweep-seed${seed}`, set, key);
      return;
    }

    default:
      throw new Error(
        `unknown command "${args.command}". Try: gen, session, drill, faded, reminder, sweep. ` +
          `Standards built so far: ${BUILT.join(", ")}`,
      );
  }
}

main();
