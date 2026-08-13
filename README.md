# Practice Generator

Verified, interleaved practice sets for the algebra placement retake.
Solutions are **computed and re-verified, never authored**.

- `brief.md` — the domain reference. Standards, diagnosis, exercise types, the
  error-signature taxonomy, progress states, the plan. **Source of truth for
  anything pedagogical.**
- `CLAUDE.md` — the working notes: invariants, conventions, and the operations
  map. Loaded automatically by Claude Code.

---

## Status

**All six build-order steps are done. All ten standards are built.**

| Step | | State |
|---|---|---|
| 1 | RNG + `Item` type + 7.NS.A.1 generator + verifier | done |
| 2 | `render.ts`, printable output | done |
| 3 | Remaining tier 1 + tier 2 generators | done |
| 4 | `assemble.ts` + the three assembler tests | done |
| 5 | Tier 3 + 4 generators | done |
| 6 | `--from-log` | done |

| Tier | Standards |
|---|---|
| 1 — root causes, daily | `7.NS.A.1` `5.NBT.B.5` |
| 2 — cheap, travel week | `8.EE.A.1` `8.EE.A.2` `8.F.A.1` |
| 3 — procedural | `7.EE.A.1` `7.EE.B.4` `8.EE.C.7b` |
| 4 — compound | `8.EE.C.8b` `8.F.B.4` |

Nothing from the non-goals list is present: no UI, no auth, no database, no
adaptive difficulty, no spaced-repetition engine, no LaTeX. Output is
monospace ASCII in fenced blocks.

## Usage

```bash
bun install
bun test

bun run session --tier 1,2 --count 12 --seed 7   # interleaved mixed set
bun run session --from-log --count 12            # guarantees logged misses
bun run gen --standards 7.NS.A.1 --count 10      # named standards, no rules
bun run drill --standard 5.NBT.B.5 --count 20    # one standard, repetitive
```

Flags: `--standards` `--standard` `--tier` `--count` `--seed` `--date` `--out`
`--from-log` `--no-write`.

`--seed 42 --date <d>` is byte-identical on every run, so a set she has already
taken can be regenerated exactly — for the tutor, or to diff two sessions.
`out/` is therefore gitignored: it is fully reproducible from a seed.

## Layout

```
brief.md                  domain reference
log.md                    error log (brief.md §8 format)
src/
  generate.ts             seeded RNG, data model, generate/verify loop
  assemble.ts             session builder + log.md parser
  render.ts               markdown out
  registry.ts             the standard-to-generator map
  linear.ts               shared linear-expression reader/renderer
  cli.ts
  standards/
    7.NS.A.1.ts           signed arithmetic          tier 1
    5.NBT.B.5.ts          multiplication fluency     tier 1
    8.EE.A.1.ts           exponent rules             tier 2
    8.EE.A.2.ts           square and cube roots      tier 2
    8.F.A.1.ts            function vocabulary        tier 2
    7.EE.A.1.ts           like terms                 tier 3
    7.EE.B.4.ts           inequalities               tier 3
    8.EE.C.7b.ts          variables on both sides    tier 3
    8.EE.C.8b.ts          systems by substitution    tier 4
    8.F.B.4.ts            linear word problems       tier 4
out/                      generated sets + keys (gitignored)
```

Two files were not in the original file plan. `registry.ts` holds the
standard-to-generator map that `assemble.ts`, `cli.ts` and the tests all need.
`linear.ts` is the shared expression reader four standards use to evaluate
printed text back into numbers — one reader beats four copies.

## Two design decisions worth keeping

**The verifier does not trust the generator.** `verify()` re-parses the
*printed* expression and re-evaluates it from scratch, then compares against the
stored solution. It never reuses the arithmetic that produced the item. A bug in
sign bookkeeping, in rendering, or in formatting therefore shows up as a
rejected item rather than as a confident, wrong answer key. It also checks the
brief's constraints — magnitudes in `[2, 20]`, at least one negative operand,
integer answer, ASCII-only — and rejects any distractor that happens to equal
the correct answer.

**The student sheet does not name the standard.** The brief is explicit that a
heading which tells you the procedure is exactly what blocked practice trains,
and that the retake is interleaved. Standards, tiers and per-item seeds appear
on the answer key only.

## Per-item seeds

Each item draws its own seed from the run RNG, so `Item.seed` reproduces a
single item in isolation, and an item rejected by the verifier consumes one draw
rather than desynchronising the stream.

## Two places this build departs from the original spec, deliberately

**The 8.EE.A.2 verifier does more than the spec asked.** The retired spec gave it as
`coeff² × radicand === original`. That check passes for `2 sqrt(18)` against
`sqrt(72)` — 4 × 18 = 72 — which is exactly the misconception the standard
exists to catch. The verifier therefore also asserts the radicand is squarefree,
which is what makes an extraction maximal. Without it the generator would ship
the error as the answer key. There is a test for this.

**8.F.B.4 stories are templates, not computed text.** A word problem needs
prose, and prose has to be written once by a human. Everything the key asserts
is still computed from the same parameters — the numbers, the model equation,
the solution, the sentence. The verifier also checks that every number in the
model actually appears in the story, which catches a template that drops or
renames a value. That is the most a verifier can do about English.

**Decimal products are not "fractional answers".** The global constraint says
integer solutions only. Read literally that would delete the `decimal × decimal`
form, whose whole purpose is the decimal-place-count misconception. It is read
here as barring fractions and non-terminating answers — the no-calculator
concern — so exact decimals stay. All decimal arithmetic is done in integers
with the point placed afterwards, so no float error reaches the key.

## Spaced recall re-drills the exact problem

`log.md` takes an optional sixth field: the item seed. `Item.seed` round-trips
through `generate(new RNG(seed))`, so a logged seed makes the exact problem she
missed reconstructible digit for digit — `--from-log` rebuilds it into the next
session and the key marks it as spaced recall.

Every key entry prints a paste-ready log line with the seed already filled in,
so recording it costs nothing:

```
log: 2026-08-04 | 7.NS.A.1 | -10 - (-15) |  |  | 2581720956
```

Entries without a seed still work; they fall back to recall by standard, and the
assembler says so in its notes rather than silently downgrading.

## Known limits

**Tier 1 appears even when you ask for tier 2 only.** brief.md §9 runs Gate 0
daily throughout, so `--tier 2` still yields a tier-1 item. This is intentional.
