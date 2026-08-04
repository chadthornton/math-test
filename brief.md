# Algebra Placement Retake — Working Brief

*Handoff document. Written to serve three purposes: reload context in a fresh chat, act as a build spec for a problem generator, and be handable to the tutor.*

---

## 1. Situation

| | |
|---|---|
| **Retake** | Thursday, August 20, 3:30pm — *proposed by teacher, not yet confirmed in writing* |
| **Today** | August 3 |
| **First attempt** | 57% |
| **Format** | Mostly show-your-work. 2–3 multiple choice. **No calculator.** |
| **Attempts remaining** | One. This is it. |
| **Goal** | Algebra 1 in 8th grade, to keep the calculus-by-senior-year path open |

**Availability is the binding constraint, not the calendar:**

```
Aug 4–9     home            6 working days
Aug 10–17   traveling       portable practice only, no worksheets
Aug 18–19   home            2 days
Aug 20      RETAKE
```

**Support:** a math tutor, engaged a few weeks ago, continuing regardless of outcome.

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

### Dependency structure

```
5.NBT.B.5  multiplication fluency
7.NS.A.1   signed arithmetic
     │
     ├──→ 7.EE.A.1   like terms          (sign errors while distributing)
     ├──→ 8.EE.C.7b  both sides          (sign errors while moving terms)
     ├──→ 7.EE.B.4   inequalities        (flip rule IS negative reasoning)
     ├──→ 8.EE.A.1   exponents           ((−3)² vs −3²)
     └──→ 8.EE.C.8b  substitution        (compounding sign errors)
```

**Signed arithmetic is the root node.** Several downstream items partially resolve on their own once it's automatic.

### Priority tiers

**Tier 1 — root causes. Daily, short, starting immediately.**
- 7.NS.A.1 signed arithmetic
- 5.NBT.B.5 multiplication fluency

**Tier 2 — cheap, dense, low prerequisite depth. Best points-per-minute.**
- 8.F.A.1 function vocabulary *(possibly a single session — it's definitions)*
- 8.EE.A.1 exponent rules
- 8.EE.A.2 square roots

**Tier 3 — procedural, unlocks once Tier 1 is solid.**
- 7.EE.A.1 like terms
- 8.EE.C.7b variables on both sides
- 7.EE.B.4 inequalities

**Tier 4 — compound. Requires everything above. Do last.**
- 8.EE.C.8b systems by substitution
- 8.F.B.4 word problems with linear models

---

## 4. Instructional design decisions

These are the reasoning behind the plan. Preserve them or argue with them, but don't lose them.

**Interleaving over blocking.** She completed the Khan course fast and still scored 57%. Khan is organized by unit — blocked practice, where the heading tells you which procedure to use. The test is interleaved. Blocked practice reliably produces confidence without transfer, and the skill it never trains is *deciding which procedure applies*. **Never group practice problems by type.**

**Spacing over massing.** The travel window is an asset, not a loss, provided practice stays short and frequent rather than absent.

**Faded worked examples.** Full worked solution → same type with last step blank → last two steps blank → nothing. The fade is the scaffold. More effective than "here's one example, now do twenty."

**Diagnostic distractors.** For multiple choice, each wrong option should encode a specific misconception so the choice she makes identifies the error. For constructed response, the answer key should list the likely wrong answer and its meaning.

**Constructed response measures, MC triages.** Use quick MC to sweep many standards and locate soft spots; use show-your-work only where the sweep pointed. MC alone permits backsolving and overstates competence.

---

## 5. Item generation spec

For a generator. Each entry: parameters, constraints, and the misconception the item is designed to expose.

### 7.NS.A.1 — signed arithmetic
```
forms:   a + b | a − b | a − (−b) | −a + b | a − b − c
range:   |a|,|b|,|c| ∈ [2, 20]
require: at least one negative operand
trap:    double negative (a − (−b))
error:   treats a − (−b) as a − b
```

### 5.NBT.B.5 — multiplication fluency
```
forms:   2-digit × 1-digit | 2-digit × 2-digit | decimal × decimal
range:   [12, 99]
no calculator; time per item ≈ 20s
error:   place value in partial products; decimal place count
```

### 8.EE.A.1 — exponent rules
```
forms:   x^a · x^b | x^a ÷ x^b | (x^a)^b | x^0 | x^(−a)
range:   a,b ∈ [2, 8]
error:   multiplies exponents when multiplying bases
```

### 8.EE.A.2 — roots
```
forms:   √(perfect square) | ∛(perfect cube) | simplify √n
n:       has a perfect-square factor ≥ 4, n ≤ 200
error:   pulls out a non-maximal factor (√72 → 2√18)
```

### 7.EE.A.1 — like terms
```
form:    ax + b(cx + d) + e
require: b < 0 in ≥ half of items
error:   distributes b to first term only; combines unlike terms
```

### 7.EE.B.4 — inequalities
```
form:    ax + b {<,>,≤,≥} c
require: a < 0 in ≥ half of items
error:   fails to flip sign; wrong dot fill; wrong arrow direction
```

### 8.EE.C.7b — variables on both sides
```
form:    ax + b = cx + d,  a ≠ c
require: integer solution; negative coefficients present
error:   sign error moving terms across
```

### 8.EE.C.8b — systems, SUBSTITUTION
```
form:    one equation solved for a variable, one not
         e.g.  y = 2x − 3  and  4x + 3y = 11
require: substitution is the intended path, NOT equal-values
error:   omits parentheses when substituting; solves for only one variable
```

### 8.F.A.1 — function vocabulary
```
forms:   set of ordered pairs | table | graph description | verbal relation
terms she must produce: input, output, domain, range, function,
        vertical line test, relation
error:   believes repeated OUTPUT breaks functionhood (it doesn't)
```

### 8.F.B.4 — linear word problems
```
form:    story → define variable → write equation → solve → sentence w/ units
require: rate + starting value clearly extractable
error:   attaches rate to wrong slot; stops at the number; omits units
```

### Session assembly recipe
```
1.  Pick 12–14 items.
2.  Never two consecutive items from the same standard.
3.  Tier 1 appears in EVERY session regardless of plan.
4.  Include ≥ 2 items she missed in a prior session (spaced recall).
5.  Randomize order after selection. Do not sort by difficulty.
6.  Answer key: worked solution + likely wrong answer + what it means.
```

---

## 6. Assets already built

| File | Purpose | Status |
|---|---|---|
| `algebra-placement-cheatsheet.md` | 15 skills + no-calculator toolkit + traps | current |
| `how-many-steps.md` | multi-step problem planning, backward chaining | current |
| `practice-test.md` | two 30-min sessions | **needs revision — see §7** |
| `practice-test-answer-key.md` | worked solutions + misconception notes | **needs revision — see §7** |

---

## 7. Known errors to correct

**Systems method mismatch.** The practice test teaches the **equal-values** method (both equations in `y =` form, set them equal). The teacher specified **substitution**. All systems material needs rebuilding against substitution form. This is the highest-priority correction.

**Coverage gap.** The practice test underweights exponents, roots, and raw multiplication because Chad's pre-test read was that they'd be de-emphasized. The results say otherwise. All three are confirmed weak areas and need real coverage.

**Function vocabulary is untested.** The existing material tests whether she can *apply* the function rule, not whether she knows the *words*. The teacher's phrasing was "function vocabulary," which suggests terminology, not procedure.

---

## 8. Plan shape

**Aug 4–9, home.** Tier 1 daily, 15–20 min. Tier 2 in parallel — function vocabulary first, likely the cheapest points available.

**Aug 10–17, traveling.** Retrieval only. Mental math, sign rules, exponent rules, vocabulary. No graph paper, no worksheets. Short and frequent beats long and rare.

**Aug 18–19, home.** Interleaved mixed sets. First exposure to random problem order. Substitution and word problems get their real workout here.

**Division of labor.** Tutor owns Tier 4 (substitution, word problems) — that's where a specialist earns their rate. Parent owns Tier 1 drilling, which is repetitive and doesn't need one.

---

## 9. Open questions

- Retake date not confirmed in writing. Worth locking down.
- Exact travel dates unknown — only that Aug 10 and 17 are out.
- Is a formula sheet provided on the test, or must formulas be memorized?
- Is the retake the same instrument or a new form?
- Time limit on the test?

---

## 10. Error log

*This section is the reason a fresh chat can pick up where the last one left off. Log **observations, not conclusions** — the raw error is irreplaceable, the diagnosis is reproducible.*

**Format:**

```
DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | got stuck / wrong / slow?
```

**Good entry:**

```
Aug 6 | 7.EE.B.4 | −3x + 2 > 11 | wrote x > −3 | wrong, no flip
Aug 6 | 7.EE.A.1 | 7x − 2(3x − 5) + 4 | wrote x − 6 | wrong, dropped 2nd distribute
Aug 6 | 5.NBT.B.5 | 47 × 8 | correct but ~50s | slow, not wrong
```

**Useless entry:**

```
Aug 6 | struggled with inequalities
```

The difference matters. "Wrote `x > −3`" identifies a single missing rule. "Struggled with inequalities" could be the flip rule, the arrow direction, the dot fill, or the underlying equation solving — four different fixes.

**Also log what she gets right after previously missing it.** That's the signal a gate has actually closed.

---

## 11. Tutor progression

*A topic list isn't a sequence. This is the sequence, with gates.*

Tutor time is scarce — realistically 3–5 sessions before the retake. **Do not spend it on Tier 1 drilling.** That's repetitive, doesn't need a specialist, and the parent can run it.

### Two tracks

**Track A — the dependent chain.** Each rung requires the one below.

```
GATE 0   signed arithmetic + multiplication fluency     ← parent-owned, daily
  │
  ▼
RUNG 1   like terms  (7.EE.A.1)
  │      distributing a negative IS signed arithmetic
  ▼
RUNG 2   variables on both sides  (8.EE.C.7b)
  │
  ├──────────────────┐
  ▼                  ▼
RUNG 3            RUNG 4
inequalities      substitution
(7.EE.B.4)        (8.EE.C.8b)
  │                  │
  └────────┬─────────┘
           ▼
        RUNG 5
        word problems with linear models  (8.F.B.4)
```

**Track B — independent. Can run any time, in any order, in parallel.**

```
function vocabulary  (8.F.A.1)
exponent rules       (8.EE.A.1)
square roots         (8.EE.A.2)
```

Track B doesn't depend on Gate 0, which makes it **the travel-week track** — no worksheets required, works in a car or an airport.

### Gate criterion

Do not advance a rung on "she did twenty of them." Advance on:

> **4 of 5 consecutive correct, work shown, on two different days.**

The two-different-days clause is the important half. Same-session success is often recognition, not retention.

### Faded example protocol

Per rung, in order. Most tutors stop at step 4.

```
1.  Tutor works one aloud, narrating DECISIONS not steps
    ("I see a negative outside parentheses, so I'm watching both terms")

2.  Tutor works one, leaves the final step to her

3.  Tutor sets it up, she finishes it

4.  She works one solo, tutor silent

5.  She works one pulled from a MIXED set, unlabeled
```

**Step 5 is the transfer test and the one that gets skipped.** Steps 1–4 all tell her which procedure to use. Only step 5 makes her decide.

### Have her explain it back

After each rung, she teaches the procedure back to the tutor in her own words, including *how she knew* to use it. Self-explanation surfaces gaps that correct answers hide.

---

## 12. Working with the teacher

**She is the assessor, not the coach.** That line determines everything.

**Reasonable to ask** — all logistics, all cheap:

- Confirm August 20, 3:30pm in writing *(currently proposed, not confirmed)*
- **Can Lella review her graded test, even supervised and without keeping it?** — highest-value ask on this list. Reviewing your own errors is the single most efficient study activity available, and it would replace all of §10's guesswork with fact.
- Same instrument, or a new form?
- Is a formula sheet provided, or are formulas memorized?
- Time limit?

**Not reasonable to ask:**

- More granular diagnostics. She gave ten specific areas the first time she was asked. Asking again reads as not accepting the answer.
- Any re-litigation of the placement recommendation. That case has been made once, clearly and graciously received. Making it twice weakens it.
- Review of practice materials, or prep coaching. Asking the assessor to help you prepare for her own assessment puts her in an unfair position.

**Coordinate through one parent.** The thread currently runs through Heather. Two parents emailing separately reads as pressure regardless of intent.

**Spend goodwill carefully.** If the retake doesn't go the family's way, Colleen is Lella's Math 8 teacher next year. The relationship outlasts the placement.

---

## 13. The honest checkpoint

The stated goal is Algebra placement. The real goal is that she can survive a fast-paced algebra class — the teacher's specific concern was pace and how little review precedes new material building on Math 8.

These two goals happen to align here, because the gaps are foundational rather than exotic. Closing them makes her genuinely more prepared, not merely better at this test.

**But:** if signed arithmetic isn't close to automatic by around August 18, that is itself information about the placement question, and worth weighing honestly rather than pushing through.
