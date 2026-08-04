// Seeded RNG, the core data model, and the generate/verify loop.
//
// Build order step 1 (spec.md). Nothing here knows about any particular
// standard -- standard modules implement Generator and get driven by
// generateItems() below.

export type Standard =
  | "7.NS.A.1"
  | "5.NBT.B.5"
  | "8.EE.A.1"
  | "8.EE.A.2"
  | "7.EE.A.1"
  | "7.EE.B.4"
  | "8.EE.C.7b"
  | "8.EE.C.8b"
  | "8.F.A.1"
  | "8.F.B.4";

export type Tier = 1 | 2 | 3 | 4;

export interface Item {
  standard: Standard;
  prompt: string; // ASCII, monospace-safe
  solution: string; // computed, never hand-written
  work: string[]; // ordered steps for the key
  trap: string; // likely wrong answer + what it means
  tier: Tier;
  seed: number;
}

export interface Session {
  seed: number;
  date: string;
  items: Item[];
}

export interface Generator {
  standard: Standard;
  tier: Tier;
  generate(rng: RNG): Item;
  verify(item: Item): boolean; // REQUIRED
}

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

// mulberry32: 32-bit state, uniform enough for picking integers in [2,20],
// and trivially reproducible from a single number.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  readonly seed: number;
  private next: () => number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }

  float(): number {
    return this.next();
  }

  /** Inclusive on both ends. */
  int(min: number, max: number): number {
    if (max < min) throw new Error(`int(${min}, ${max}): empty range`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(xs: readonly T[]): T {
    if (xs.length === 0) throw new Error("pick(): empty array");
    return xs[this.int(0, xs.length - 1)]!;
  }

  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** +1 or -1. */
  sign(): 1 | -1 {
    return this.bool() ? 1 : -1;
  }

  /**
   * Derive a child seed. Each item gets its own seed drawn from the run RNG,
   * so any single item is reproducible on its own (Item.seed) and a rejected
   * item simply consumes one draw rather than desynchronising the stream.
   */
  fork(): number {
    return Math.floor(this.next() * 4294967296) >>> 0;
  }
}

// ---------------------------------------------------------------------------
// generate -> verify -> if false, discard and regenerate
// ---------------------------------------------------------------------------

export class VerificationError extends Error {}

export interface GenerateOptions {
  maxAttempts?: number;
  /** Called for every item that failed its verifier. */
  onReject?: (item: Item, attempt: number) => void;
}

/** Produce exactly one verified item. Throws rather than shipping a bad one. */
export function generateItem(
  gen: Generator,
  rng: RNG,
  opts: GenerateOptions = {},
): Item {
  const maxAttempts = opts.maxAttempts ?? 200;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const item = gen.generate(new RNG(rng.fork()));
    if (gen.verify(item)) return item;
    opts.onReject?.(item, attempt);
  }
  throw new VerificationError(
    `${gen.standard}: no item passed verification in ${maxAttempts} attempts`,
  );
}

export function generateItems(
  gen: Generator,
  rng: RNG,
  count: number,
  opts: GenerateOptions = {},
): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < count; i++) items.push(generateItem(gen, rng, opts));
  return items;
}
