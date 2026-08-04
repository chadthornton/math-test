# Practice Generator — Build Spec

**Companion doc:** `algebra-retake-brief.md` — the domain reference. This spec does not duplicate it. §5 of the brief defines item parameters; §11 defines the progression. Read both.

**Deadline:** August 20. **Time box: one evening.** If it isn't generating usable sessions after one sitting, stop and fall back to markdown by hand.

---

## Purpose

Generate verified, interleaved practice sets for ten CCSS standards, on demand, with answer keys that are correct by construction.

**The core requirement:** solutions are **computed, never authored.** An LLM writing a problem also writes its answer, and both can be wrong in ways that look fine. A generator picks parameters and derives the solution — so the key can be mechanically checked.

## Non-goals

Explicitly out of scope. Do not build these.

- Web UI, dashboards, progress visualizations
- Auth, accounts, multi-user
- Database of any kind — flat files only
- Adaptive difficulty algorithms
- A real spaced-repetition implementation
- LaTeX / KaTeX rendering (monospace ASCII is proven adequate)

---

## Stack

TypeScript + Bun. No framework. Output is markdown to stdout or file.

```
/
  brief.md                  domain reference (copy of the brief)
  log.md                    error log — see brief §10
  src/
    standards/
      7.NS.A.1.ts           one module per standard
      5.NBT.B.5.ts
      8.EE.A.1.ts
      8.EE.A.2.ts
      7.EE.A.1.ts
      7.EE.B.4.ts
      8.EE.C.7b.ts
      8.EE.C.8b.ts
      8.F.A.1.ts
      8.F.B.4.ts
    generate.ts             seeded RNG + generate/verify loop
    assemble.ts             session builder, enforces brief §5 rules
    render.ts               markdown out
    cli.ts
  out/                      generated sessions + keys
```

---

## Data model

```ts
type Standard = "7.NS.A.1" | "5.NBT.B.5" | /* ... */;

interface Item {
  standard: Standard;
  prompt: string;          // ASCII, monospace-safe
  solution: string;        // computed, never hand-written
  work: string[];          // ordered steps for the key
  trap: string;            // likely wrong answer + what it means
  tier: 1 | 2 | 3 | 4;
  seed: number;
}

interface Session {
  seed: number;
  date: string;
  items: Item[];
}
```

Every standard module exports the same shape:

```ts
interface Generator {
  standard: Standard;
  tier: 1 | 2 | 3 | 4;
  generate(rng: RNG): Item;
  verify(item: Item): boolean;   // REQUIRED
}
```

---

## Verification — the part that matters

**No item ships unless its verifier passes.** The generate loop is:

```
generate → verify → if false, discard and regenerate
```

This is what makes the generator trustworthy rather than just fast. Verifiers per standard:

| Standard | Verifier |
|---|---|
| 7.NS.A.1 | recompute the expression, compare |
| 5.NBT.B.5 | recompute the product |
| 8.EE.A.1 | substitute a numeric base into both forms, assert equal |
| 8.EE.A.2 | assert `coeff² × radicand === original` |
| 7.EE.A.1 | evaluate original and simplified at 5 random x, assert all equal |
| 7.EE.B.4 | boundary satisfies equality; test one point inside and one outside the solution set |
| 8.EE.C.7b | substitute claimed x into both sides, assert equal |
| 8.EE.C.8b | substitute (x, y) into **both** original equations |
| 8.F.A.1 | assert generated relation's actual functionhood matches the stated label |
| 8.F.B.4 | substitute the solution into the model equation |

**Global constraints, enforced at generation:**

- Integer solutions only (no fractional answers — the real test is no-calculator)
- No division by zero, no degenerate cases (`a === c` in variables-on-both-sides)
- Negative coefficients present in ≥ half of items for 7.EE.A.1 and 7.EE.B.4 — that's the diagnosed weakness

**Assembler tests** (from brief §5):

- no two consecutive items share a standard
- every session contains ≥ 1 tier-1 item
- every session contains ≥ 2 items from the "missed" list

---

## Determinism

Seeded RNG. `--seed 42` produces byte-identical output every run. This lets you regenerate a session she already took, hand the tutor the exact same set, or diff two sessions.

---

## CLI

```bash
bun run gen --standards 7.NS.A.1,7.EE.A.1 --count 10 --seed 42
bun run session --tier 1,2 --count 12 --seed 7
bun run session --from-log --count 12        # weights toward logged misses
bun run drill --standard 5.NBT.B.5 --count 20
```

All commands emit two files to `out/`: the set and the key.

---

## Output format

Match the existing sheets — they're already proven readable on paper. Fenced code blocks for all math, stacked ASCII fractions, one item per block with a rule between. See `practice-test.md` and `practice-test-answer-key.md` for the target.

Key format per item: worked solution, then the likely wrong answer and what it means.

---

## Build order

```
1.  RNG + Item type + one generator (7.NS.A.1) + its verifier
2.  render.ts, confirm output is printable
3.  Remaining tier 1 + tier 2 generators
4.  assemble.ts with the three assembler tests
5.  Tier 3 + 4 generators
6.  --from-log
```

**Stop after step 4 if the evening runs out.** Tiers 1 and 2 are the daily drilling and the travel-week work — that's most of the value. Tiers 3 and 4 are 3–5 tutor sessions, which can run off hand-written material.

---

## Opening prompt for Claude Code

> Read `brief.md` and `spec.md`. Build steps 1 and 2 of the build order only —
> seeded RNG, the Item type, the 7.NS.A.1 generator with its verifier, and
> markdown rendering. Show me printed output for 10 items before continuing.
> Do not build any other standard yet, and do not add anything from the
> non-goals list.
