# What's next

The queue, in dependency order, with what "done" means for each. `workflow-spec.md`
holds the prescriptive detail; this file is the status board and the record of
decisions already made, so nothing gets re-litigated.

**Order is not negotiable.** `today` depends on `progress` depends on `grade`.
Building `today` first means testing every branch against an empty log, where
they all evaluate identically — a state that stops existing after day one.

---

## 1 · `grade` — NEXT UP

**Spec:** `functional-overview.md` §4 for the shape and the worked example;
`workflow-spec.md` §Build order for the constraints.

**The flow.** Instructor supplies exactly two things: which item numbers were
wrong, and what she wrote. Everything else the tool already knows — it generated
the set.

```
$ bun run grade --date 2026-08-13

  12 items in this set. Which were wrong?  3, 7, 11
  Item 3   -3x + 2 > 11   (correct: x < -3)
  she wrote:  x > -3
  → NO_FLIP                                   [logged]
```

**Requirements.**

- **Correct items are inferred.** It asked twelve, you named three, the other
  nine were right. That is what keeps gate tracking honest without logging every
  correct answer by hand.
- **Auto-classify** where what she wrote matches an entry in `Item.predictedErrors`.
- **Numbered menu** of that standard's signatures where it does not. Recognition,
  not recall — the instructor should never have to know signature vocabulary.
- **Some signatures will never be computable. The menu is the right answer for
  those, not a failure.** Do not chase full auto-classification.
- **Append to `log.md`'s existing six-field format, below the marker.** Do not
  invent a second format.
- **Find the set through `sessions.md`.** `grade --date` resolves the invocation
  from the index, regenerates, and compares fingerprints. **On a mismatch, refuse
  to log.** A generator change between printing and grading would otherwise
  attach her answers to problems she never saw, silently.

**Depends on:** `sessions.md` (done), `predictedErrors` (done for `7.EE.B.4`).

---

## 2 · `progress`

**Spec:** `brief.md` §7, `functional-overview.md` §5.

States `NOT_STARTED` · `SHAKY` (<60%) · `CLOSE` (≥60%, gate unmet) · `GATED`,
plus open signatures per node. Derived entirely from `log.md` — delete it and
rebuild, nothing is lost.

**Gate:** 4 of 5 consecutive correct, work shown, **on two different dates**.
The two-dates clause is the load-bearing half.

**A node drops to `SHAKY` on any miss inside an interleaved set, regardless of
prior state.** Passing blocked and failing mixed is the exact failure this
project exists to correct; it must be visible rather than averaged away.

**Depends on:** real `log.md` entries. Not code — data.

---

## 3 · `drill` — the real fluency drill

**Ruled Aug 13.** A fluency drill and a blocked set are different artifacts and
the drill does not currently exist as its own mode:

| | items | shows | needs |
|---|---|---|---|
| fluency drill | 20 | answers only, no working space | somewhere to record elapsed time |
| blocked set | 8–10 | work shown, full worked key | working space |

`drill` today renders the blocked set. Gate 0 is drilled daily, so the fluency
drill is the highest-frequency artifact in the whole plan.

**Build after `grade`, not before.** `drill --count 20` plus a phone timer is a
usable substitute meanwhile, so this blocks nothing.

---

## 4 · `today`

**Spec:** `workflow-spec.md` in full. It orchestrates the existing commands —
it does not reimplement generation, assembly, or rendering.

Its invariants are already written as a test list in that file. Two rulings that
resolved its open questions:

- **Open-signature slots:** one re-serves by seed (the most recent miss for that
  signature), the rest are fresh from the same standard.
- **A re-served problem retires** once it has been answered correctly. Every
  later check for that signature is fresh. Otherwise she memorises the item and
  it stops measuring anything.

---

## Not blocked on code

**`log.md` is empty.** This is the actual bottleneck. `progress`, `today`, and
trap re-ranking are all functions of data that does not exist. Every answer key
prints a paste-ready `log:` line with the seed pre-filled.

**`src/reminders.ts` has not been reviewed by a human.** It is the only content
in the repo no verifier can check, and it is what she reads *before* working. A
confidently wrong statement of the flip rule is the worst artifact this project
could produce. Read it once, correct it, then leave it alone — do not
regenerate it.

---

## Ongoing, per-standard

**`predictedErrors` for the other nine standards.** Built for `7.EE.B.4`
(`NO_FLIP` / `OVER_FLIP`). This is per-standard work, not a global change: each
one needs the misconception derived from that standard's own parameters.

Only signatures **reachable from her written answer** belong there. See the
limit recorded in `CLAUDE.md`.

---

## Deferred, with reasons

**Graphing observation for `grade`.** `WRONG_DOT` and `WRONG_ARROW` are
unreachable from a single text field — she can write a correct inequality and
still draw the number line wrong. They wait until `grade` can take a separate
observation for graphing items. Adding them to `predictedErrors` now would imply
coverage the classifier does not have.

**`DERIVE` and `ADVISE`** (the operations map in `CLAUDE.md`). Adaptive
difficulty was ruled *in* on Aug 13, so both are in scope — but they are
functions of logged data, and guessing their shape before it exists produces the
wrong shape. `progress` above is `DERIVE`'s first half.

---

## Done

- `sessions.md` index + invocation on the key — a seed alone does not identify a
  set, since `--count` and `--tier` change the items too.
- `predictedErrors` for `7.EE.B.4`, with `trap` derived from it so the key and
  the classifier cannot drift.
- All six of `brief.md` §4's exercise types have a render mode, though the
  fluency drill still shares one with the blocked set — see 3 above.
