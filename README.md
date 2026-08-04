# Practice Generator

Verified, interleaved practice sets for the algebra placement retake.
Solutions are **computed and re-verified, never authored**.

- `brief.md` — the domain reference. Standards, diagnosis, item parameters, progression.
- `spec.md` — the build spec. Stack, data model, verification rules, build order.

### A note on the brief's filename

The brief is referred to by three names across the source documents — its
companion-doc line calls it `algebra-retake-brief.md`, the stack tree calls it
`brief.md`, and it arrived as `algebraretakebrief.md`. **They are all the same
document.** It lives here as `brief.md`. There is no second brief to find.

---

## Status

Build order steps **1 and 2 are done**. Steps 3–6 are not started.

| Step | | State |
|---|---|---|
| 1 | RNG + `Item` type + 7.NS.A.1 generator + verifier | done |
| 2 | `render.ts`, printable output | done |
| 3 | Remaining tier 1 + tier 2 generators | not started |
| 4 | `assemble.ts` + the three assembler tests | not started |
| 5 | Tier 3 + 4 generators | not started |
| 6 | `--from-log` | not started |

Nothing from the non-goals list is present: no UI, no auth, no database, no
adaptive difficulty, no spaced-repetition engine, no LaTeX. Output is
monospace ASCII in fenced blocks.

## Usage

```bash
bun install
bun test
bun run gen --standards 7.NS.A.1 --count 10 --seed 42
```

Flags: `--standards` `--count` `--seed` `--date` `--out` `--no-write`.

`--seed 42 --date <d>` is byte-identical on every run, so a set she has already
taken can be regenerated exactly — for the tutor, or to diff two sessions.
`out/` is therefore gitignored: it is fully reproducible from a seed.

Only `gen` exists. `session`, `drill` and `--from-log` arrive with steps 4 and 6.

## Layout

```
brief.md                  domain reference
spec.md                   build spec
src/
  generate.ts             seeded RNG, data model, generate/verify loop
  render.ts               markdown out
  cli.ts
  generate.test.ts
  standards/
    7.NS.A.1.ts           signed arithmetic (tier 1)
out/                      generated sets + keys (gitignored)
```

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
