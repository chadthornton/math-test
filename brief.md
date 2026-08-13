# Algebra Placement Retake — Working Brief

*Handoff document. Written to reload context in a fresh chat, act as a build spec input, and stand alone if neither happens.*

---

## 1. Situation

| | |
|---|---|
| **Retake** | Monday, August 24 |
| **Today** | Thursday, August 13 |
| **Runway** | 11 days |
| **First attempt** | 57% |
| **Format** | Mostly show-your-work. 2–3 multiple choice. **No calculator.** |
| **Attempts remaining** | One |
| **Goal** | Algebra 1 in 8th grade, keeping the calculus-by-senior-year path open |

**Logistics:** traveling the whole stretch, but printer access is available. Treat every day as a normal working day. No portable-only constraint.

**Staffing:** no tutor. **The parent is the instructor.** This is the single most important design constraint in this document — see §6.

---

## 2. Standards framework

The school's study guide is anchored to Khan Academy's **8th grade Illustrative Mathematics** course, units 3, 4, 5, 7, 8. IM is Common Core aligned, so every item traces to a CCSS-M code.

Prerequisite chains: **Achieve the Core Coherence Map** — `tools.achievethecore.org/coherence-map`. An arrow A → B means a student who can't do A is unlikely to do B. Use it to decide how far back to drop when something breaks.

---

## 3. Diagnosis

Teacher-reported weak areas, mapped and sorted by grade level:

| Weak area | Standard | Grade |
|---|---|---|
| multiplication without a calculator | 5.NBT.B.5 | **5** |
| negative numbers, add/subtract | 7.NS.A.1 | **7** |
| simplifying expressions, like terms | 7.EE.A.1 | **7** |
| solving and graphing inequalities | 7.EE.B.4 | **7** |
| exponents | 8.EE.A.1 | 8 |
| square roots | 8.EE.A.2 | 8 |
| equations, variables on both sides | 8.EE.C.7b | 8 |
| systems by **substitution** | 8.EE.C.8b | 8 |
| function vocabulary | 8.F.A.1 | 8 |
| word problems, linear models | 8.F.B.4 | 8 |

**Half the list is below grade 8.** This reads as an arithmetic fluency problem propagating upward and presenting as ten separate failures, not as ten independent content gaps.

### The graph

```
                    GATE 0
        5.NBT.B.5 multiplication fluency
        7.NS.A.1  signed arithmetic
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   7.EE.A.1       8.EE.A.1       8.EE.A.2
   like terms     exponents      roots
        │         (near-indep)   (near-indep)
        ▼
   8.EE.C.7b
   variables both sides
        │
   ┌────┴────┐
   ▼         ▼
7.EE.B.4  8.EE.C.8b
inequal.  substitution
   │         │
   └────┬────┘
        ▼
   8.F.B.4  word problems

   8.F.A.1  function vocabulary   ← fully independent, cheapest node
```

**Signed arithmetic is the root.** Several downstream nodes partially resolve once it's automatic. Function vocabulary hangs off nothing — it's definitions, and likely the cheapest points on the board.

> **Note:** multiplication **automaticity** — the 1–10 times table — is being addressed as a separate drilling app. Don't duplicate that work here. The multi-digit **algorithm** (2-digit × 1-digit and up) is a different skill: it is a written procedure whose failure mode is place value in the partial products, so it belongs on paper with the work shown, and the generator does produce it. This brief assumes recall is handled elsewhere and focuses on signed arithmetic.

---

## 4. Exercise types

These are distinct instruments with distinct purposes. Don't collapse them — each is a separate render mode for the generator.

| Type | Purpose | Shape |
|---|---|---|
| **Fluency drill** | automaticity | 20 items, timed, one standard, answers only |
| **Faded example** | acquisition | 4 versions of one type, decreasing scaffold |
| **Blocked set** | consolidation | 8–10 items, one standard, work shown |
| **Interleaved set** | transfer | 12–14 items, mixed standards, randomized |
| **Reminder sheet** | reference | one page per node, read before working |
| **Diagnostic sweep** | triage | MC, many standards, fast, distractors encode misconceptions |

**The ordering within a node is:** reminder sheet → faded example → blocked set → (later) interleaved set.

**Blocked practice consolidates. Only interleaved practice transfers.** She completed the Khan course quickly and still scored 57% — Khan is blocked by unit, so the heading always told her which procedure to use. The test never does. Every session in the last three days must be interleaved.

---

## 5. Reminder sheets

One per node. Structured, not prose, so they can be re-ranked by evidence rather than rewritten.

**Fixed structure per node:**

```
RULE        1–3 bullets. The thing itself. Always shown.
SEQUENCE    numbered steps. "Do this, then this." Always shown.
EXAMPLE     one canonical worked instance. Always shown.
TRAPS       bulleted, each tagged with an error signature.
```

**The revision mechanism: don't rewrite, re-rank.**

Every trap bullet carries an error signature. The error log records signatures. When a sheet is regenerated, traps she has actually hit are promoted to the top and marked; traps she has never hit are demoted or dropped.

This matters because regenerating reminder prose from scratch each time reintroduces math errors. Authored once and verified, then selected and ordered by data, the prose stays correct while the sheet stays personal.

### Error signature taxonomy

```
7.NS.A.1    DOUBLE_NEG · SIGN_RULE · SUBTRACT_ORDER
5.NBT.B.5   PLACE_VALUE · CARRY · SLOW
8.EE.A.1    MULT_VS_ADD_EXP · ZERO_EXP · NEG_EXP
8.EE.A.2    NON_MAXIMAL_FACTOR · CUBE_VS_SQUARE · PERFECT_SQ_RECALL
7.EE.A.1    PARTIAL_DISTRIBUTE · SIGN_DISTRIBUTE · UNLIKE_TERMS
7.EE.B.4    NO_FLIP · OVER_FLIP · WRONG_ARROW · WRONG_DOT
8.EE.C.7b   SIGN_MOVE · COLLECT_WRONG_SIDE
8.EE.C.8b   NO_PARENS_SUB · ONE_VAR_ONLY · WRONG_SUB_TARGET
8.F.A.1     OUTPUT_REPEAT · VLT_MISAPPLY · VOCAB_TERM
8.F.B.4     RATE_SLOT · STOPPED_AT_NUMBER · NO_UNITS · NO_VAR_DEF
```

`OVER_FLIP` is worth calling out: flipping the inequality sign when merely *adding or subtracting* a negative. Half-remembering the rule is its own failure mode, distinct from not knowing it.

---

## 6. Teaching without a tutor

The faded-example protocol was designed around a live person. It survives, but it moves onto paper.

**Live version (unavailable):**
```
1. tutor works one aloud, narrating decisions
2. tutor works one, leaves the last step
3. tutor sets up, she finishes
4. she works one solo
5. she works one from a mixed set
```

**Printed version (use this):**
```
LEVEL 1   fully worked, every step shown, with reasoning in the margin
LEVEL 2   same type, worked down to the final step — she fills it in
LEVEL 3   setup given, all solving steps blank
LEVEL 4   problem only
LEVEL 5   same type, buried in a mixed unlabeled set
```

All five levels use **the same problem type with different numbers.** The fade is the scaffold.

**Consequence:** the answer key is no longer a grading aid. It is the instruction. Worked solutions must show *reasoning*, not just steps — "I see a negative outside parentheses, so I'm watching both terms," not `7x − 6x + 10 + 4`.

**Self-explanation substitute:** after each node, she explains the procedure back out loud, including how she knew to use it. This catches gaps that correct answers hide, and it costs nothing.

---

## 7. Progress tracking

Flat file. One row per node.

```
STANDARD    STATE       ATTEMPTS  CORRECT  LAST     OPEN SIGNATURES
7.NS.A.1    GATED       24        22       Aug 15   —
7.EE.A.1    CLOSE       15        11       Aug 17   PARTIAL_DISTRIBUTE
7.EE.B.4    SHAKY       10        4        Aug 17   NO_FLIP, WRONG_DOT
8.EE.C.8b   NOT_STARTED 0         0        —        —
```

**States:**

```
NOT_STARTED   no attempts
SHAKY         < 60% correct
CLOSE         ≥ 60%, gate not yet met
GATED         gate met
```

**Gate criterion — do not advance on volume:**

> **4 of 5 consecutive correct, work shown, on two different days.**

The two-different-days clause is the important half. Same-session success is usually recognition, not retention. That is precisely how a completed Khan course coexists with a 57%.

**A node returns to SHAKY** if it later fails in an interleaved set, regardless of prior state. Passing blocked and failing mixed is the signature failure of this whole situation, and it should be visible.

---

## 8. Error log

*Log observations, not conclusions. The raw error is irreplaceable; the diagnosis is reproducible.*

```
DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | SIGNATURE
```

**Good:**
```
Aug 15 | 7.EE.B.4 | −3x + 2 > 11 | x > −3 | NO_FLIP
Aug 15 | 7.EE.A.1 | 7x − 2(3x − 5) + 4 | x − 6 | PARTIAL_DISTRIBUTE
Aug 15 | 5.NBT.B.5 | 47 × 8 | 376, ~50s | SLOW
```

**Useless:**
```
Aug 15 | struggled with inequalities
```

"Wrote `x > −3`" names one missing rule. "Struggled with inequalities" could be the flip rule, the arrow, the dot, or the underlying equation solving — four different fixes.

**Also log correct answers on previously-missed types.** That's the signal a gate is closing.

---

## 9. Eleven-day plan

Gate 0 (signed arithmetic) runs **daily throughout**, 10–15 minutes, no exceptions.

```
Aug 13–15    Gate 0  +  independent nodes
             8.F.A.1 function vocabulary   ← start here, cheapest
             8.EE.A.1 exponents
             8.EE.A.2 roots

Aug 16–19    Gate 0  +  the chain
             7.EE.A.1  like terms
             8.EE.C.7b variables both sides
             7.EE.B.4  inequalities

Aug 20–21    Gate 0  +  the compound nodes
             8.EE.C.8b substitution
             8.F.B.4   word problems

Aug 22–23    INTERLEAVED ONLY
             mixed sets, randomized, unlabeled
             one full-length timed run

Aug 24       RETAKE
```

If a node hasn't gated by its slot, it gets one extra day pulled from Aug 22 — but do not sacrifice both interleaving days. Blocked mastery that never gets mixed is the exact failure being corrected here.

---

## 10. Known corrections

**Systems method.** Earlier practice material taught the **equal-values** method (both equations in `y =` form, set equal). The teacher specified **substitution**. All systems material must be rebuilt against substitution form.

**Coverage.** Earlier material underweighted exponents, roots, and raw multiplication on the assumption they'd be de-emphasized. The results say otherwise. All three are confirmed weak areas.

**Function vocabulary is untested so far.** Existing material tests whether she can *apply* the function rule, not whether she knows the *words*. "Function vocabulary" suggests terminology — input, output, domain, range, relation, vertical line test.

---

## 11. Working with the teacher

**She is the assessor, not the coach.**

Reasonable to ask — logistics only:
- **Can Lella review her graded first attempt, even supervised, without keeping it?** Highest-value ask available. It would replace §8's inference with fact.
- Same instrument or a new form?
- Formula sheet provided, or memorized?
- Time limit?

Not reasonable: more granular diagnostics (she answered thoroughly once), or re-litigating the placement decision. Coordinate through one parent.

---

## 12. The honest checkpoint

The stated goal is Algebra placement. The real goal is surviving a fast-paced algebra class — the teacher's specific concern was pace, and how little review precedes new material building on Math 8.

These align here, because the gaps are foundational rather than exotic. Closing them makes her genuinely more prepared, not merely better at this test.

**But:** if signed arithmetic hasn't gated by around August 21, that is itself information about the placement question, and worth weighing honestly rather than pushing through.
