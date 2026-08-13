# `bun run today` — Workflow Spec

*Prescriptive. This resolves the ambiguities left in `functional-overview.md`, which is the human-readable companion and not sufficient to implement from.*

> Checked against the repo Aug 13. Its tier claims are correct: Gate 0 is
> `7.NS.A.1` alone and `5.NBT.B.5` is tier 2. The `--dry-run` example carried a
> deliberate inconsistency (`5.NBT.B.5` shown being "dropped from" a drill it is
> never in, and a 73% node labelled SHAKY); both are corrected below so the
> example is safe to build from.

**Purpose:** one command decides and emits the day's artifacts. The workflow becomes code and gets tested, rather than living in prose that drifts.

```bash
bun run today                    # emits today's sheets to out/
bun run today --dry-run          # prints the plan, generates nothing
bun run today --date 2026-08-16  # override
```

---

## Node lifecycle — resolves the pool-entry ambiguity

Three phases, driven by the existing four states. **No separate criteria.**

| State | Phase | Gets |
|---|---|---|
| `NOT_STARTED` | learning | faded lesson |
| `SHAKY` (<60%) | learning | blocked set |
| `CLOSE` (≥60%, gate unmet) | mixing | blocked set **and** enters the mixed pool |
| `GATED` (4/5 on two dates) | maintained | mixed pool only, no dedicated work |

**A node joins the mixed pool at `CLOSE`, not at `GATED`.** Mixed exposure should *contribute* to gating, not wait for it — otherwise a node can only ever gate on blocked evidence, which is exactly the failure mode this project exists to correct.

**A node that fails in a mixed set drops to `SHAKY` and re-enters learning.** It gets a reprinted reminder sheet and a fresh blocked set.

---

## Daily emission

`today` always emits **two sheets plus keys**.

### Sheet 1 — Gate 0 drill

```
20 items, timed, answers only
standard: 7.NS.A.1 only
emitted EVERY day until it gates
```

**Gate 0 is signed arithmetic alone.** `5.NBT.B.5` sits at **tier 2** in the registry — it covers the multi-digit multiplication *algorithm*, not fact recall. Times-table automaticity is a separate tool and does not belong in this drill.

Tier-1 density is already handled: `assemble.ts` rule 3 guarantees at least one tier-1 item in every set regardless of the `--tier` flag, which is a deliberate departure recorded in `CLAUDE.md`. Don't re-implement it in `today`.

### Sheet 2 — main set, 12 items

Filled in this priority order:

```
1.  FOCUS NODE — the highest-priority node not yet CLOSE,
    walking brief.md §3's DAG top-down.
      · NOT_STARTED  → faded lesson, levels 1–4        (4 slots)
      · SHAKY        → blocked items                   (6 slots)
      · CLOSE        → blocked items                   (3 slots)

2.  OPEN SIGNATURES — items targeting signatures that
    have fired and not since been answered correctly.
      minimum 2, maximum 4

3.  MIXED POOL — fill all remaining slots from nodes at
    CLOSE or GATED, randomized.
```

**Ordering constraints, enforced as tests:**

- no two consecutive items share a standard
- focus-node items are **not** grouped — they scatter through the set
- no standard labels anywhere on the student sheet

**If the mixed pool has fewer than 2 members**, skip step 3 and give the slots to the focus node. This is only true for the first day or two.

### Sheet 3 — reminder sheet, conditional

Emit a node's reminder sheet when **any** of:

- the node is `NOT_STARTED` and is today's focus
- a signature fired for it in the last graded session that hadn't fired before
- the node dropped from `CLOSE` or `GATED` back to `SHAKY`

Traps she has hit are promoted to the top and marked. Otherwise don't reprint — an unchanged sheet reprinted daily stops being read.

---

## Phase override

Read the calendar from `brief.md` §9. Two dates change behavior:

```
Aug 22–23     INTERLEAVED ONLY
              · no focus node, no faded lessons, no new nodes
              · sheet 2 becomes 15 items, entirely mixed pool
                + open signatures
              · one full-length timed run on the 23rd

Aug 24        RETAKE — emit nothing
```

Before Aug 22, if a node hasn't reached `CLOSE` by its slot in the §9 plan, `today` prints a warning naming it. It does **not** silently reshuffle the plan — that's a judgment call for the instructor.

---

## Output

```
$ bun run today --dry-run

  2026-08-16 · day 4 of 11

  Gate 0        7.NS.A.1 drill, 20 items, timed

  Focus         7.EE.A.1  CLOSE (11/15, 73%)
                → 3 blocked items

  Signatures    PARTIAL_DISTRIBUTE (open, 3 hits)
                NO_FLIP (open, 2 hits)
                → 3 items

  Mixed pool    8.F.A.1, 8.EE.A.1, 8.EE.A.2, 7.NS.A.1
                → 6 items

  Reminders     7.EE.A.1 — reprint, PARTIAL_DISTRIBUTE now top

  ⚠ 8.EE.C.7b is NOT_STARTED; brief.md §9 has it starting today.

  Would write: out/2026-08-16-drill.md      + -key.md
               out/2026-08-16-set.md        + -key.md
               out/2026-08-16-reminder-7.EE.A.1.md
               (--dry-run: nothing written)
```

---

## Invariants — write as tests

```
· today emits exactly one drill sheet until Gate 0 fully gates
· main set is always 12 items (15 on Aug 22–23)
· no two consecutive items share a standard
· ≥2 open-signature items whenever ≥2 signatures are open
· focus-node items are never contiguous
· student sheet contains no standard codes, tier labels, or seeds
· --dry-run writes nothing to out/
· same date + same log state ⇒ byte-identical output
```

---

## Build order

**Already in the repo:** `gen` `session` `drill` `faded` `reminder` `sweep`. `today` **orchestrates these** — it decides what to emit and delegates. It does not reimplement generation, assembly, or rendering.

Still missing, in dependency order:

```
1.  grade    — predicted errors + only-log-the-misses flow
2.  progress — states, gates, open signatures, derived from log.md
3.  drill    — a real fluency drill: 20 items, answers only, no working
               space, a place to record elapsed time. Distinct from the
               blocked set the current `drill` renders. Ruled Aug 13:
               build it, but after grade. `drill --count 20` plus a phone
               timer is usable meanwhile.
4.  today    — the daily decision
```

**Do not build `today` first.** With an empty log every branch above evaluates identically, and you'd be testing against a state that stops existing after day one.

`grade` must emit lines in `log.md`'s existing six-field format, appended below the marker comment. Don't invent a second format.

---

## Resolved: open-signature slots (Chad, Aug 13)

`log.md` records an optional sixth field — the item's seed — which lets `--from-log` rebuild *that exact problem*, digit for digit, rather than a fresh one from the same standard.

Both are useful and they test different things:

- **same problem again** → did the specific correction stick?
- **new problem, same standard** → did the *procedure* transfer?

The gate criterion in `brief.md` §7 is about retention across dates, which argues for the second. Confirming a correction landed argues for the first.

**Ruling:** one slot re-serves by seed — the most recent miss for that
signature — and the rest are fresh from the same standard.

**Plus one rule this spec did not have: a given problem is re-served ONCE.**
After it has been re-served and answered correctly it is retired, and every
later check for that signature is fresh. Otherwise she memorises the specific
item and it stops measuring anything.
