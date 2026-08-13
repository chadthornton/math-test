# Error log

Log **observations, not conclusions.** The raw error is irreplaceable; the
diagnosis is reproducible. See brief.md §10.

**Format** — one entry per line, five fields, pipe separated, plus an optional
sixth:

```
DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | got stuck / wrong / slow? | SEED
```

Good:

```
Aug 6 | 7.EE.B.4 | -3x + 2 > 11 | wrote x > -3 | wrong, no flip | 2581720956
Aug 6 | 7.EE.A.1 | 7x - 2(3x - 5) + 4 | wrote x - 6 | wrong, dropped 2nd distribute
Aug 6 | 5.NBT.B.5 | 47 x 8 | correct but ~50s | slow, not wrong
```

## The sixth field is worth the two seconds

Every item on every answer key prints a ready-to-paste line like this:

```
log: 2026-08-04 | 7.NS.A.1 | -10 - (-15) |  |  | 2581720956
```

Copy it, fill in the two blanks, drop the `log: ` prefix. That number is the
item's seed, and it is the difference between two kinds of spaced recall:

- **without a seed** — a later session gives her *another problem from the same
  standard*. Useful, but not the one she got wrong.
- **with a seed** — a later session rebuilds *that exact problem*, digit for
  digit. That is what tests whether the gate actually closed, and it is what
  brief.md §11 means by "4 of 5 consecutive correct, on two different days."

Entries without a seed still work. They just fall back to standard-level recall,
and the assembler says so in its notes.

Useless:

```
Aug 6 | struggled with inequalities
```

**Also log what she gets right after previously missing it.** That is the
signal a gate has actually closed.

Two notes on how this file is read by the generator:

- `session --from-log` counts an entry as a miss when the outcome field contains
  **wrong** or **stuck**. `slow, not wrong` is deliberately not a miss.
- Entries above the rule below are examples and are ignored — only lines whose
  second field is a real standard code are parsed, so headings and prose here
  cost nothing.

---

<!-- Real entries below this line. -->
