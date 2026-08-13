# Practice System — Functional Overview

*The CLI described as if it were a product. Six sections over one shared spine.*

> **Orientation only — do not implement from this file.** `workflow-spec.md`
> is the prescriptive companion; the repo itself is authoritative wherever
> either disagrees. Status claims here were written from outside the repo and
> have been wrong before. Corrected against the code on Aug 13.

---

## Two users, not one

| | Uses | Touches |
|---|---|---|
| **Instructor** (parent) | Library, Builder, Grader, Progress, Coach | the CLI |
| **Student** | Worksheets only | paper |

The student never sees the tool. Everything she encounters is printed, and deliberately so — the retake is on paper with no calculator, and practice should match. This also means **the printed artifact is the entire student-facing product.** If it doesn't read well on paper, nothing else matters.

---

## The loop

```
   ┌─────────────────────────────────────────────┐
   │                                             │
   ▼                                             │
BUILDER ──► WORKSHEETS ──► [she works] ──► GRADER
   ▲                                             │
   │                                             ▼
 COACH ◄──────── PROGRESS ◄──────────────── JOURNAL
```

One pass per sitting. Ten to fifteen minutes of instructor time on either end.

---

## 1 · Library

**The authored knowledge base. The only section a human writes.**

- Ten CCSS standards with parameters and constraints
- The prerequisite DAG — which node gates which
- Error-signature taxonomy (`NO_FLIP`, `PARTIAL_DISTRIBUTE`, …)
- Reminder content: rules, sequences, canonical examples, trap explanations

**Status:** built. Standards, the signature taxonomy (`src/signatures.ts`), and
reminder content for all ten nodes (`src/reminders.ts`) — authored but **not yet
reviewed by a human**, which is the one thing no verifier can do for it.

**Gate 0 is `7.NS.A.1` alone.** `5.NBT.B.5` sits at tier 2: it covers the
multi-digit multiplication *algorithm*, not fact recall. Times-table
automaticity is drilled by a separate app and is not generated here. This has
been mis-stated three times; it is stated here so it cannot be re-derived wrong.

**The rule that governs it:** everything here is hand-written and verified once. The tool may select, rank, and order this content. It may never generate it. A wrong *problem* gets caught by a verifier; a wrong *explanation* gets studied.

---

## 2 · Builder

**Turns "what should she do today" into a printable.**

- Picks items by tier, standard, or open error signatures
- Generates each item fresh from parameters, then verifies it against its own printed text
- Orders the set: no two consecutive items from one standard, at least one Gate 0 item, at least two previously-missed
- Seeded — same seed, byte-identical output, forever

**Status:** built. All ten standards.

```bash
bun run session --tier 1,2 --count 12 --seed 7
bun run session --from-log --count 12
bun run drill --standard 5.NBT.B.5 --count 20
```

---

## 3 · Worksheets

**What she actually holds. Six formats, each doing a different job.**

| Format | Purpose | Shape | When |
|---|---|---|---|
| Diagnostic sweep | **find the holes** | 1–2 items × all 10 standards, MC, untimed | start, and once midway |
| Reminder sheet | reference | one page per node | before working a node |
| Faded lesson | acquisition | one type, 5 decreasing scaffolds | first contact with a node |
| Blocked set | consolidation | 8–10 items, one standard, work shown | right after the faded lesson |
| Interleaved set | **transfer** | 12–14 mixed, randomized, unlabeled | continuously, from the moment 2 nodes have gated |
| Fluency drill | **speed** | 20 items, timed, one standard, answers only | daily on Gate 0 only |

### Sweep vs. drill — different axes entirely

They look similar and do opposite jobs.

```
DIAGNOSTIC SWEEP      wide + shallow + untimed
                      all ten standards, 1–2 items each
                      output: a MAP of where the holes are
                      answers the question "what should we work on?"

FLUENCY DRILL         narrow + deep + TIMED
                      one standard she can already do
                      output: a TIME
                      answers the question "is it automatic yet?"
```

A sweep tests things she can't do. A drill tests things she can — the point is making them fast enough to stop consuming working memory. Only Gate 0 — **signed arithmetic, `7.NS.A.1` alone** — needs drilling; nothing else on the list is a speed problem, and multi-digit multiplication is a procedure rather than a recall gap.

### The five scaffolds

Same problem *type* at every level, different numbers. She is never guessing at the procedure — only supplying more of it each time.

```
LEVEL 1   fully worked, reasoning in the margin

          5x + 3(2x − 4) − 7
          5x + 6x − 12 − 7      ← minus hits BOTH terms in the parens
          11x − 19              ← 5x and 6x are like terms, combine

LEVEL 2   worked to the last step, she finishes

          8x + 2(3x − 5) − 4
          8x + 6x − 10 − 4
          __________

LEVEL 3   setup given, all solving blank

          6x + 4(2x − 3) + 9
          distribute first: __________
          then combine:     __________

LEVEL 4   problem only

          9x − 5(x + 2) − 3

LEVEL 5   same type, buried unlabeled in a mixed set
```

**Levels 1–4 all tell her which procedure to use.** Only level 5 makes her decide, which is the thing the retake actually measures. A faded lesson that stops at level 4 has taught the procedure and not the recognition.

### When does interleaving start?

**Not at the end.** Waiting until everything is blocked-complete is the single most tempting mistake here.

The rule:

```
A node earns entry to the mixed pool by completing
faded → blocked.

The mixed pool starts running the moment it has TWO members.

From then on, every session has an interleaved component,
even while other nodes are still in faded/blocked.
```

Interleaving is diagnostic as well as instructional. It's the only thing that reveals a node that "gated" on recognition rather than retention — and that has to surface with days left to fix it, not on the 23rd.

The last stretch (per `brief.md` §9, Aug 22–23) is interleaved-**only**: nothing new enters, everything gets mixed.

**Two design rules that aren't obvious:**

**No standard labels on the student sheet.** A heading naming the procedure is exactly what blocked practice trains, and it's why a completed Khan course coexists with a 57%. Standards, tiers, and seeds live on the answer key only.

**The answer key is instructional, not just corrective.** With no tutor, the worked solution *is* the teaching. It has to show reasoning — *"negative outside parentheses, so I'm watching both terms"* — not just the steps.

**Status:** five commands cover six formats — `drill`, `faded`, `session`,
`reminder`, `sweep`, plus `gen`.

**The fluency drill does not exist as its own mode.** `drill` renders a blocked
set: work space, full worked key. The row above specifies 20 items, answers
only, no working space, and somewhere to record elapsed time. `drill --count 20`
plus a phone timer is the interim substitute. Ruled Aug 13: build the real
drill, but **after** `grade`.

---

## 4 · Grader

**Records what happened. The section most likely to be abandoned, and the one everything depends on.**

- Walks the set item by item
- Takes what she wrote, verbatim
- Assigns an error signature
- Appends to the journal, never edits it

**Status:** currently a manual paste-a-line-per-item flow. **That design will not survive ten days** and should be replaced before any real logging starts.

### The problem

Per missed item, the current flow asks the instructor to supply the date, standard, problem text, her answer, an error signature, and a seed. Six fields, times four to six misses, times ten days, typed into a terminal while holding a paper worksheet. It will be abandoned around day three.

### The fix: the tool already knows almost everything

It generated the set. It knows every problem, every correct answer, every standard, and every seed. **The only thing it doesn't know is what she wrote.**

So the instructor supplies exactly two things: which items were wrong, and what she put.

```
$ bun run grade --seed 7 --date 2026-08-13

  12 items in this set. Which were wrong?  3, 7, 11

  Item 3   −3x + 2 > 11        (correct: x < −3)
  she wrote:  x > −3
  → NO_FLIP                                        [logged]

  Item 7   7x − 2(3x − 5) + 4  (correct: x + 14)
  she wrote:  x − 6
  → PARTIAL_DISTRIBUTE                             [logged]

  Item 11  √72                 (correct: 6√2)
  she wrote:  2√18
  → NON_MAXIMAL_FACTOR                             [logged]

  9 correct, 3 wrong. Logged.
```

Three short answers and a list of numbers. No seeds, no standards, no signature vocabulary.

**Correct items are inferred.** The tool knows it asked twelve; you named three; the other nine were right. That's what keeps gate tracking accurate without logging anything correct by hand.

### Signatures: the instructor should never have to know them

Two mechanisms, in order:

**Auto-classification via predicted errors.** Each item carries the wrong answers that known misconceptions produce. This isn't guesswork about her psychology — it's arithmetic. If you skip the flip on `−3x + 2 > 11`, you get `x > −3`, computably. If you distribute to only the first term of `−2(3x − 5)`, you get `x − 6`, computably. The generator has the parameters; deriving each misconception's output is the same work as deriving the right answer.

**A numbered menu when nothing matches.** Recognition, not recall:

```
  she wrote:  x = −3
  → no match. Which of these?
      1) SIGN_MOVE      2) COLLECT_WRONG_SIDE
      3) NO_FLIP        4) something else
```

### Correction to earlier guidance

I previously said to defer predicted errors until real log data existed. **That was wrong.** The common signatures are mechanically derivable from the item's own parameters, not inferred from her behavior — so there's nothing to wait for, and they're precisely what makes capture cheap enough to actually happen.

Build the grader with predicted errors before the first session. It's the difference between a logging habit that lasts ten days and one that lasts three.

### Grade on paper first

Mark up the answer key with a pen while sitting with her — circle the misses, write what she put. Then run `grade` once, in a batch, away from the table. Don't type into a terminal mid-session.

---

## 5 · Progress

**Where she stands on the graph.**

- One state per node: `NOT_STARTED` · `SHAKY` · `CLOSE` · `GATED`
- Open error signatures per node
- Gate: 4 of 5 consecutive correct, work shown, **on two different dates**
- **Any node drops to `SHAKY` when it fails inside an interleaved set**, regardless of prior state

That last rule is the whole point. Passing blocked and failing mixed is the exact failure being corrected, and it has to be visible rather than averaged into a percentage.

**Status:** not built. Purely derived from the journal — delete it and rebuild, nothing is lost.

---

## 6 · Coach

**Answers "what should she do tomorrow."**

- Reads progress against the DAG
- Names the next unlocked node
- Flags signatures that keep firing after their sheet was re-ranked
- Flags gated nodes that regressed under interleaving

**Status:** not built, and deliberately last. Its output shape should follow from real data.

---

## The spine · Journal

Underneath all six. One append-only file, one line per graded item.

```
date · standard · problem · what she wrote · signature · seed
```

**Everything else is derived and disposable.** Progress, sheets, sessions — all reconstructible from the journal plus a seed. The journal itself is not reconstructible from anything.

Consequences worth stating plainly: never edit it by hand, never let a tool rewrite past lines, and **it is currently empty**, which is why sections 5 and 6 can't exist yet.

---

## A daily sitting

```
INSTRUCTOR   build and print                       2 min
STUDENT      works the set                     15–25 min
INSTRUCTOR   grade, log, reprint any sheet
             whose traps have shifted             10 min
```

---

## Known gaps

**No session index.** *Correct, and being built.* A seed alone does not identify
a set — `--count` and `--tier` change the output too, so grading needs the whole
invocation. See `sessions.md`.

**No fluency drill.** See §3. Ruled: build after `grade`.

**Reminder sheets don't re-rank yet.** *Wrong — they do.* `rankTraps()` promotes
traps she has hit; `reminder --from-log` drives it. What is missing is journal
data to rank against.

**No diagnostic sweep.** *Wrong — `sweep` is built*, and §3 above says so. This
entry contradicted its own document.

---

## What lives outside the app

Judgment. When a signature keeps firing after the sheet was re-ranked, or a gated node regresses, deciding *what that means* and *what to change* is a conversation, not a feature.

The app records and reports. It doesn't decide.
