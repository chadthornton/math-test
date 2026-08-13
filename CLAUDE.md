# Practice generator — working notes

A CLI that generates verified, interleaved algebra practice sets for a placement
retake. TypeScript + Bun, no framework, markdown to stdout or file.

## Read these first

- `brief.md` — the domain reference. Standards and diagnosis (§3), exercise
  types (§4), the error-signature taxonomy (§5), progress states and the gate
  criterion (§7), the error-log format (§8), the day-by-day plan (§9). **This is
  the source of truth for anything pedagogical.**

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
bun test                                          # 201 tests
bunx tsc --noEmit

bun run session --tier 1,2 --count 12 --seed 7    # interleaved, assembly rules
bun run session --from-log --count 12             # re-drills logged misses
bun run gen --standards 7.NS.A.1 --count 10       # named standards, no rules
bun run drill --standard 7.NS.A.1 --count 20      # one standard
bun run faded --standard 7.EE.B.4 --seed 3        # brief.md §6 ladder
bun run reminder --standard 7.EE.B.4 --from-log   # brief.md §5 rule sheet
bun run sweep --count 10 --seed 4                 # brief.md §4 MC triage
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
`src/signatures.ts` — brief.md §5's taxonomy as data.
`src/exercises.ts` — the other three render modes from brief.md §4.
`src/reminders.ts` — **authored** reminder prose. Read the header before
touching it: it is the only content here no verifier can check.
`src/standards/<code>.ts` — one module per standard, ten of them. `5.NBT.B.5`
covers the multi-digit algorithm only (smallest item `12 x 2`); the 1-10 times
table is brief.md §3's "automaticity" and is drilled by a separate app.

`registry.ts` and `linear.ts` were not in the original file plan; both exist to
avoid duplicating one thing across several call sites.

## Conventions

- **ASCII only**, monospace-safe. No LaTeX — it is on the non-goals list. Use
  `sqrt(72)`, `x^(-3)`, `<=`, `x` for multiplication.
- **The student sheet never names the standard.** brief.md §4: a heading that
  tells you the procedure is exactly what blocked practice trains, and the retake
  is interleaved. Standards, tiers and seeds go on the answer key only.
- **A distractor's value is computed; its explanation is authored.** Format:
  `` `wrong` -- what choosing it means ``. Derive the wrong value from the error
  signature brief.md §5 names for that standard, and never ship one equal to the
  correct answer. Read "Authored vs. generated" below before touching the
  explanation text — it is prose, and prose is not generated here.
- Per-item seeds: each item draws its own seed, so `generate(new RNG(item.seed))`
  reproduces it exactly. This is what `--from-log` spaced recall depends on.

## Adding a standard

1. `src/standards/<code>.ts` exporting `{ standard, tier, generate, verify }`.
2. Verify by re-reading the printed text. Check the item parameters recorded in
   the module header, and the signatures in brief.md §5.
3. Register it in `src/registry.ts`.
4. Tests in `src/standards.test.ts` — the `describe.each(BUILT)` block covers the
   shared contract automatically; add cases for the named misconception.
5. If the spec states a constraint on a *batch* rather than an item ("negative
   coefficients in ≥ half of items"), use the optional `balance` field.

## Deliberate departures from the original spec — do not "fix" these

- **`8.EE.A.2` verifies more than the spec asked.** The retired check was
  `coeff² × radicand === original`, passes for `2 sqrt(18)` against `sqrt(72)` —
  the exact misconception the standard exists to catch. The verifier also asserts
  the radicand is squarefree. There is a test.
- **Tier 1 appears even under `--tier 2`.** brief.md §9 runs Gate 0 daily
  throughout, regardless of what else a session is for.
- **`8.F.B.4` stories are hand-written templates.** Prose cannot be computed. All
  numbers, the model, the solution and the sentence still are, and the verifier
  checks every number in the model appears in the story.

## Non-goals — do not build

Web UI, dashboards, progress visualizations, auth, accounts, multi-user, a
database of any kind, a real spaced-repetition implementation (SM-2 style
interval scheduling), LaTeX/KaTeX rendering. Flat files only.

*Adaptive difficulty was on this list and was removed by ruling on Aug 13 —
see the operations map below.*

---

# Consolidated from spec.md and the pre-build handoff

*Both are retired — see the last section. `brief.md` is not, and takes
precedence over this file on any pedagogy question.*

## Authored vs. generated

**Two content classes. Never blur them.**

| | Authored | Generated |
|---|---|---|
| What | reminder prose, trap explanations, DAG edges, standard metadata | items, sessions, sheets, progress |
| Written by | human, verified once | machine |
| Checked by | review | verifiers |
| Regenerated | **never** | freely |

A generated *item* can be mechanically verified — re-derive the answer from the
printed text and assert. A generated *explanation* cannot. There is no test that
catches a confidently wrong statement of the inequality flip rule, and that is
exactly the artifact she would study from.

**So: the tool may select, rank, and order authored prose. It may never write
it.**

This extends the existing computed-not-authored rule from answers to
explanations. Same principle, and the failure is quieter because nothing throws.

**Where this lands on distractors.** A distractor has two parts and they fall on
opposite sides of the table. The wrong *value* is computed — `8.EE.A.2` derives
`2 sqrt(18)` from the item's own coefficient rather than having it typed in. The
*explanation* beside it is authored prose with computed numbers dropped into
fixed slots: a human wrote and verified the sentence, and the machine only fills
the blanks. That is the intended arrangement. Do not let a later change start
generating the sentence itself.

## Operations map

Seven concerns. Four are built; three are not.

```
  CATALOG ──┬──► GENERATE ──► ASSEMBLE ──► RENDER ──► [paper]
            │                    ▲                       │
            │                    │                       ▼
            │                 DERIVE ◄── CAPTURE ◄── [her answers]
            │                    │
            └──────► ADVISE ◄────┘
```

| Operation | State |
|---|---|
| CATALOG — standards, signatures, item parameters | built |
| GENERATE — parameterized items + verifiers | built |
| ASSEMBLE — interleaving, spaced recall | built |
| RENDER — printable output | built |
| CAPTURE — log intake | **manual paste only** |
| DERIVE — progress state from log | **not built** |
| ADVISE — what to work on next | **not built** |

Do not build DERIVE or ADVISE until `log.md` has at least a week of real
entries. They are functions of data that does not exist yet, and guessing at
their shape now will produce the wrong shape.

> **RULED (Chad, Aug 13): adaptive difficulty is wanted.** It has been removed
> from the non-goals list. DERIVE and ADVISE are therefore in scope to build.
>
> The deferral above still stands, and it is empirical rather than policy:
> both are functions of logged data, and guessing their shape before the data
> exists produces the wrong shape. Build them when `log.md` has real entries.
>
> A *real spaced-repetition implementation* (SM-2 style interval scheduling)
> remains a non-goal and is a different thing: brief.md §9 is a fixed
> eleven-day plan, not an open-ended review schedule.

Two notes on CATALOG's "built": item parameters live in the standard modules,
but the error signatures exist only as comments. There is no `Signature` type
and nothing validates a signature string.

## Logging protocol

`log.md` is the source of truth for everything downstream. Append-only. Never
rewrite it, never let a tool edit past entries.

Every answer key prints a paste-ready line with the seed pre-filled:

```
log: 2026-08-13 | 7.NS.A.1 | -4 + 11 |  |  | 3277083196
```

Fill the two blank fields as:

```
field 4   what she actually wrote, verbatim
field 5   an error signature from brief.md §5
```

**Verbatim matters.** `x > -3` names one missing rule. `struggled with
inequalities` could be the flip rule, the arrow, the dot, or the underlying
equation solving — four different fixes, and the entry is worthless for all of
them.

**Signatures come from the taxonomy in `brief.md` §5** — `NO_FLIP`,
`PARTIAL_DISTRIBUTE`, `NON_MAXIMAL_FACTOR`, and so on. If a genuinely new
failure mode appears, add it to the taxonomy in `brief.md` first, then use it.
Never put free text where a signature belongs.

**Also log correct answers on previously-missed types.** That is the only signal
that a gate is closing.

**Known gap:** `misses()` in `src/assemble.ts` still classifies field 5 by
searching for the words *wrong* or *stuck*, which was the previous free-text
format. A log written with signatures reads as zero misses and `--from-log`
degrades silently to an ordinary session. Fixing it is a behaviour change, not a
documentation one, and has not been done.

### Deferred: predicted errors

A later upgrade, not a blocker. Items would carry the wrong answers each known
misconception produces:

```ts
predictedErrors: Record<Signature, string>
// -3x + 2 > 11  ->  { NO_FLIP: "x > -3", SIGN_MOVE: "x < -13/3" }
```

Grading then classifies automatically instead of requiring judgment, and logging
friction approaches zero — which is what makes logging survive a real week. **Do
not build this before real entries exist.** The predicted-error tables should be
derived from failures she actually makes, not from failures we imagine.

## Progress states

For when DERIVE gets built. Definitions live in `brief.md` §7.

```
NOT_STARTED · SHAKY (<60%) · CLOSE (>=60%, gate unmet) · GATED
```

**Gate:** 4 of 5 consecutive correct, work shown, **on two different dates.**
The two-dates clause is the important half — same-session success is usually
recognition, not retention.

**A node drops back to SHAKY on any miss inside an interleaved set, regardless
of prior state.** Passing blocked and failing mixed is the exact failure this
whole project exists to correct, and it must be visible rather than averaged
away.

## What stays outside the repo

Diagnosis. When a signature keeps firing after the sheet was re-ranked, or a
gated node fails in a mixed set, that is a judgment call about what it means and
what to change.

The tool records and reports. It does not decide.

## Retired documents

- `spec.md` — implemented. Its invariants are in this file and its item
  parameters became code. Deleted; not authoritative.
- The pre-build handoff — described work already done. It was a chat artifact
  and was never committed to this repo, so there was no `HANDOFF.md` to delete.
  Its surviving content is above.

`brief.md` is not retired and is not superseded by code.
