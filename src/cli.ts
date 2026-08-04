// CLI. Only the `gen` command and only 7.NS.A.1 exist so far -- build order
// steps 1 and 2. `session`, `drill` and `--from-log` are steps 4 and 6.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  RNG,
  generateItems,
  type Generator,
  type Session,
  type Standard,
} from "./generate.ts";
import { renderKey, renderSet } from "./render.ts";
import signedArithmetic from "./standards/7.NS.A.1.ts";

const GENERATORS: Partial<Record<Standard, Generator>> = {
  "7.NS.A.1": signedArithmetic,
};

interface Args {
  command: string;
  standards: string[];
  count: number;
  seed: number;
  date: string;
  write: boolean;
  outDir: string;
}

function parseArgs(argv: string[]): Args {
  const [command = "gen", ...rest] = argv;
  const flags = new Map<string, string>();
  let write = true;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--no-write") {
      write = false;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`--${key} needs a value`);
    }
    flags.set(key, next);
    i++;
  }

  const seed = Number(flags.get("seed") ?? 42);
  const count = Number(flags.get("count") ?? 10);
  if (!Number.isInteger(seed) || seed < 0) throw new Error("--seed must be a non-negative integer");
  if (!Number.isInteger(count) || count < 1) throw new Error("--count must be a positive integer");

  return {
    command,
    standards: (flags.get("standards") ?? "7.NS.A.1").split(",").map((s) => s.trim()).filter(Boolean),
    count,
    seed,
    date: flags.get("date") ?? new Date().toISOString().slice(0, 10),
    write,
    outDir: flags.get("out") ?? "out",
  };
}

function resolve(names: string[]): Generator[] {
  return names.map((name) => {
    const gen = GENERATORS[name as Standard];
    if (!gen) {
      const built = Object.keys(GENERATORS).join(", ");
      throw new Error(
        `${name}: not built yet (build order step 3+). Available: ${built}`,
      );
    }
    return gen;
  });
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.command !== "gen") {
    throw new Error(
      `unknown command "${args.command}". Only \`gen\` exists so far; ` +
        "`session` and `drill` arrive with build order step 4.",
    );
  }

  const generators = resolve(args.standards);
  const rng = new RNG(args.seed);
  let rejected = 0;

  // Round-robin so a multi-standard run never emits a block of one type
  // (brief.md §4). Real interleaving lands in assemble.ts, step 4.
  const perStandard = generators.map((gen) =>
    generateItems(gen, rng, Math.ceil(args.count / generators.length), {
      onReject: () => rejected++,
    }),
  );
  const items = [];
  for (let i = 0; items.length < args.count; i++) {
    for (const batch of perStandard) {
      if (batch[i] && items.length < args.count) items.push(batch[i]!);
    }
  }

  const session: Session = { seed: args.seed, date: args.date, items };
  const set = renderSet(session);
  const key = renderKey(session);

  process.stdout.write(set + "\n" + key);

  if (args.write) {
    const slug = args.standards.join("+");
    mkdirSync(args.outDir, { recursive: true });
    const setPath = join(args.outDir, `${args.date}-${slug}-seed${args.seed}.md`);
    const keyPath = join(args.outDir, `${args.date}-${slug}-seed${args.seed}-key.md`);
    writeFileSync(setPath, set);
    writeFileSync(keyPath, key);
    process.stderr.write(`\nwrote ${setPath}\nwrote ${keyPath}\n`);
  }

  process.stderr.write(
    `${items.length} items verified, ${rejected} rejected by verifier\n`,
  );
}

main();
