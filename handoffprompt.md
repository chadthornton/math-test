This project was built in Claude Code on the web and is now moving local.
Everything is pushed to GitHub on `main` — nothing to reconstruct.

## Setup

```bash
git clone https://github.com/chadthornton/math-test
cd math-test
bun install
bun test           # expect 214 passing
bunx tsc --noEmit  # expect silent
```

Bun is the only prerequisite (`curl -fsSL https://bun.sh/install | bash`).

## Read in this order

1. **`CLAUDE.md`** — loads automatically. Invariants, conventions, the
   operations map, and a list of deliberate departures marked "do not fix these".
2. **`NEXT.md`** — the work queue. What is next, what "done" means for it, and
   the decisions already ruled on. **This answers "what should I work on".**
3. `brief.md` — pedagogy, source of truth.
4. `workflow-spec.md` — prescriptive; `grade`, `progress`, `drill` and `today`
   build from it. `functional-overview.md` is orientation only, do not implement
   from it.

**The repo is authoritative wherever any document disagrees with the code.**
Both specs were written from outside the repo and were wrong about tiers and
build status more than once. They were corrected on Aug 13; assume the next
revision needs the same treatment.

## What this is

A Bun/TypeScript CLI that generates verified, interleaved, printable practice
sheets with computed answer keys, for an 8th-grade algebra placement retake on
**August 24**. No calculator, mostly show-your-work. Ten CCSS standards.

```bash
bun run session --tier 1,2 --count 12 --seed 7    # interleaved mixed set
bun run session --from-log --count 12             # re-drills logged misses
bun run faded --standard 7.EE.B.4 --seed 3        # 5-level fading scaffold
bun run reminder --standard 7.EE.B.4 --from-log   # one-page rule sheet
bun run sweep --count 10 --seed 4                 # multiple-choice triage
bun run drill --standard 7.NS.A.1 --count 20      # one standard
```

## The rule that governs everything

Solutions are **computed and re-verified, never authored**. No item ships unless
its verifier passes, and a verifier must re-derive the answer from the item's
**printed text** rather than reuse the arithmetic that produced it — otherwise
it is a tautology that passes when the generator is wrong.

The verify loop hides bugs as *silently rejected* items. If a form never
appears, check whether its verifier is rejecting it. That has happened three
times. It also once failed the other way: items containing a `0x` term passed
verification for weeks because `"0x".includes("x")` is true.

## Three files hold durable state

`log.md`, `sessions.md`, and `src/reminders.ts`. Everything in `out/` is
disposable — it regenerates from a line in `sessions.md`. Append to the first
two; never rewrite past lines.

## Two things I want a human on, not a guess

1. **`src/reminders.ts` is authored prose and has never been reviewed.** It is
   the one file no verifier can check, and it is what she reads *before*
   working — a confidently wrong statement of the inequality flip rule would be
   the worst possible artifact. Read it once, correct anything wrong, then leave
   it alone. Do not regenerate it.

2. **`log.md` is empty.** The actual bottleneck. `progress`, `today`, and trap
   re-ranking are all functions of data that does not exist yet. Every answer key
   prints a paste-ready `log:` line with the item's seed pre-filled.

## Do not

- Build anything on the non-goals list in `CLAUDE.md`.
- "Fix" the deliberate departures at the bottom of `CLAUDE.md`. At least one
  (`8.EE.A.2`'s squarefree check) exists specifically to stop the generator
  shipping a misconception as the answer key.
- Reorder the queue in `NEXT.md`. `today` depends on `progress` depends on
  `grade`; building `today` against an empty log tests branches that all
  evaluate identically until day one ends.
- Add `WRONG_DOT` or `WRONG_ARROW` to `predictedErrors`. They are graphing
  errors, unreachable from the single text field `grade` reads, and listing them
  would imply coverage the classifier does not have. See `NEXT.md`, Deferred.
- Label the student sheet with standards. The retake is interleaved.
- Commit anything under `out/`.

## Note

Multiplication automaticity (the 1–10 times table) is drilled by a **separate
app** and is deliberately not generated here. `5.NBT.B.5` covers the multi-digit
algorithm only — smallest item is `12 x 2`. This has been mis-stated three
times; `brief.md` §3 and `functional-overview.md` §1 now both state it outright.

## Where to start

Run the setup, confirm 214 tests pass, read `CLAUDE.md` and `NEXT.md`. The next
item is `grade` and its requirements are written out there — walk me through how
you would build it, and wait for me before changing anything.
