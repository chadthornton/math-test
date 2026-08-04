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

Build order steps **1–4 are done**, plus the log parsing half of step 6.
Tiers 1 and 2 are complete — the daily drilling and the travel-week work.

| Step | | State |
|---|---|---|
| 1 | RNG + `Item` type + 7.NS.A.1 generator + verifier | done |
| 2 | `render.ts`, printable output | done |
| 3 | Remaining tier 1 + tier 2 generators | done |
| 4 | `assemble.ts` + the three assembler tests | done |
| 5 | Tier 3 + 4 generators | not started |
| 6 | `--from-log` | log parsing done; miss weighting not started |

Standards built: `7.NS.A.1` `5.NBT.B.5` (tier 1) · `8.EE.A.1` `8.EE.A.2`
`8.F.A.1` (tier 2). Remaining: `7.EE.A.1` `7.EE.B.4` `8.EE.C.7b` `8.EE.C.8b`
`8.F.B.4` — all tier 3/4, all tutor-owned, per brief.md §8.

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
spec.md                   build spec
log.md                    error log (brief.md §10 format)
src/
  generate.ts             seeded RNG, data model, generate/verify loop
  assemble.ts             session builder + log.md parser
  render.ts               markdown out
  registry.ts             the standards that exist so far
  cli.ts
  standards/
    7.NS.A.1.ts           signed arithmetic          tier 1
    5.NBT.B.5.ts          multiplication fluency     tier 1
    8.EE.A.1.ts           exponent rules             tier 2
    8.EE.A.2.ts           square and cube roots      tier 2
    8.F.A.1.ts            function vocabulary        tier 2
out/                      generated sets + keys (gitignored)
```

`registry.ts` is not in spec.md's file tree. `assemble.ts`, `cli.ts` and the
tests all need the same standard-to-generator map, and duplicating it in three
places was worse.

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

## Two places this build departs from spec.md, deliberately

**The 8.EE.A.2 verifier does more than the spec asks.** spec.md gives it as
`coeff² × radicand === original`. That check passes for `2 sqrt(18)` against
`sqrt(72)` — 4 × 18 = 72 — which is exactly the misconception the standard
exists to catch. The verifier therefore also asserts the radicand is squarefree,
which is what makes an extraction maximal. Without it the generator would ship
the error as the answer key. There is a test for this.

**Decimal products are not "fractional answers".** The global constraint says
integer solutions only. Read literally that would delete the `decimal × decimal`
form, whose whole purpose is the decimal-place-count misconception. It is read
here as barring fractions and non-terminating answers — the no-calculator
concern — so exact decimals stay. All decimal arithmetic is done in integers
with the point placed afterwards, so no float error reaches the key.

## Known limits

**Spaced recall is by standard, not by item.** brief.md §5 rule 4 asks for ≥ 2
items she missed in a prior session. `log.md` records the problem as text, not
the seed that produced it, so the exact past item cannot be reconstructed. What
`--from-log` guarantees is ≥ 2 items drawn from the standards she missed.
Logging the per-item seed printed on the key would close this.

**Tier 1 appears even when you ask for tier 2 only.** brief.md §5 rule 3 says
tier 1 appears in every session *regardless of plan*, so `--tier 2` still yields
a tier-1 item. This is intentional.
