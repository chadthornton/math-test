# Practice generator — working notes

A CLI that generates verified, interleaved algebra practice sets for a placement
retake. TypeScript + Bun, no framework, markdown to stdout or file.

## Read these first

- `brief.md` — the domain reference. Standards, diagnosis, item parameters (§5),
  the error-log format (§10), the tutor progression (§11). **This is the source
  of truth for anything pedagogical.**
- `spec.md` — the build spec. Data model, per-standard verifier rules, non-goals.

The brief is called `algebra-retake-brief.md` in spec.md's companion-doc line and
`brief.md` in its file tree. Same document. It lives here as `brief.md`. There is
no second brief.

## The one rule that matters

**Solutions are computed and re-verified, never authored.** Every standard module
exports `verify(item)`, and the generate loop is `generate → verify → discard and
regenerate`. No item ships unless its verifier passes.

A verifier must **re-derive the answer from the item's printed text**, not reuse
the arithmetic that produced it. Reusing it makes the check a tautology that
passes even when the generator is wrong. `7.NS.A.1` re-parses the expression;
`8.EE.A.1` substitutes two numeric bases; `8.F.A.1` recomputes functionhood from
the printed relation.

The verify loop hides bugs as silently rejected items. If a form seems to never
appear, check whether its verifier is rejecting it — that has happened twice
(odd perfect squares in `8.EE.A.2`, and non-integer distractors).

## Commands

```bash
bun install
bun test                                          # 138 tests
bunx tsc --noEmit

bun run session --tier 1,2 --count 12 --seed 7    # interleaved, assembly rules
bun run session --from-log --count 12             # re-drills logged misses
bun run gen --standards 7.NS.A.1 --count 10       # named standards, no rules
bun run drill --standard 5.NBT.B.5 --count 20     # one standard
```

Same `--seed` and `--date` produce byte-identical output. That is why `out/` is
gitignored: a set is fully reproducible from its seed, so the seed is the
artifact worth keeping, not the file.

## Layout

`src/generate.ts` — seeded RNG (mulberry32), `Item`/`Session`/`Generator` types,
the generate/verify loop, shared verifier helpers.
`src/assemble.ts` — session builder + `log.md` parser.
`src/render.ts` — markdown out. `src/registry.ts` — standard → generator map.
`src/linear.ts` — shared reader that evaluates printed linear expressions.
`src/standards/<code>.ts` — one module per standard, ten of them.

`registry.ts` and `linear.ts` are not in spec.md's file tree; both exist to avoid
duplicating one thing across several call sites.

## Conventions

- **ASCII only**, monospace-safe. No LaTeX — it is on the non-goals list. Use
  `sqrt(72)`, `x^(-3)`, `<=`, `x` for multiplication.
- **The student sheet never names the standard.** brief.md §4: a heading that
  tells you the procedure is exactly what blocked practice trains, and the retake
  is interleaved. Standards, tiers and seeds go on the answer key only.
- **Distractors are computed too**, not written. Format: `` `wrong` -- what
  choosing it means ``. Build them from the misconception brief.md §5 names for
  that standard, and never ship one equal to the correct answer.
- Per-item seeds: each item draws its own seed, so `generate(new RNG(item.seed))`
  reproduces it exactly. This is what `--from-log` spaced recall depends on.

## Adding a standard

1. `src/standards/<code>.ts` exporting `{ standard, tier, generate, verify }`.
2. Verify by re-reading the printed text. Check brief.md §5 constraints too.
3. Register it in `src/registry.ts`.
4. Tests in `src/standards.test.ts` — the `describe.each(BUILT)` block covers the
   shared contract automatically; add cases for the named misconception.
5. If the spec states a constraint on a *batch* rather than an item ("negative
   coefficients in ≥ half of items"), use the optional `balance` field.

## Deliberate departures from spec.md — do not "fix" these

- **`8.EE.A.2` verifies more than the spec asks.** The stated check,
  `coeff² × radicand === original`, passes for `2 sqrt(18)` against `sqrt(72)` —
  the exact misconception the standard exists to catch. The verifier also asserts
  the radicand is squarefree. There is a test.
- **Decimal products are allowed** despite "integer solutions only". That rule
  bars fractions and non-terminating answers; `decimal × decimal` is an explicit
  form in brief.md §5 and decimal place count is its named misconception. All
  decimal arithmetic is done in integers with the point placed afterwards.
- **Tier 1 appears even under `--tier 2`.** brief.md §5 rule 3: tier 1 appears in
  every session *regardless of plan*.
- **`8.F.B.4` stories are hand-written templates.** Prose cannot be computed. All
  numbers, the model, the solution and the sentence still are, and the verifier
  checks every number in the model appears in the story.

## Non-goals (spec.md) — do not build

Web UI, dashboards, progress visualizations, auth, accounts, multi-user, a
database of any kind, adaptive difficulty, a real spaced-repetition
implementation, LaTeX/KaTeX rendering. Flat files only.
