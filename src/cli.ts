// CLI.
//
//   bun run gen     --standards 7.NS.A.1,8.EE.A.1 --count 10 --seed 42
//   bun run session --tier 1,2 --count 12 --seed 7
//   bun run session --from-log --count 12
//   bun run drill   --standard 7.NS.A.1 --count 20
//
// All commands emit two files to out/: the set and the key.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  RNG,
  generateItems,
  type Session,
  type Standard,
  type Tier,
} from "./generate.ts";
import { assemble, misses, parseLog, unknownSignatures } from "./assemble.ts";
import { renderKey, renderSet } from "./render.ts";
import { BUILT, generatorFor } from "./registry.ts";

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

function emit(
  session: Session,
  slug: string,
  args: Args,
  recall?: ReadonlySet<number>,
): void {
  const set = renderSet(session);
  const key = renderKey(session, { recall });
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

      emit({ seed, date, items }, standards.join("+"), args);
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

      emit(result.session, "session", args, result.recalled);
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
      emit({ seed, date, items }, `drill-${name}`, args);
      process.stderr.write(`${items.length} items verified, ${rejected} rejected\n`);
      return;
    }

    default:
      throw new Error(
        `unknown command "${args.command}". Try: gen, session, drill. ` +
          `Standards built so far: ${BUILT.join(", ")}`,
      );
  }
}

main();
