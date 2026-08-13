# Error log

Log **observations, not conclusions.** The raw error is irreplaceable; the
diagnosis is reproducible. See brief.md §8.

Append-only. Never rewrite past entries, and never let a tool edit them.

**Format** — one entry per line, five fields, pipe separated, plus an optional
sixth:

```
DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | SIGNATURE | SEED
```

- **field 4** — what she actually wrote, **verbatim**.
- **field 5** — an error signature from brief.md §5's taxonomy. Never free text.
  If a genuinely new failure mode appears, add it to the taxonomy in brief.md
  first, then use it here.

Good:

```
Aug 15 | 7.EE.B.4 | -3x + 2 > 11 | x > -3 | NO_FLIP | 2581720956
Aug 15 | 7.EE.A.1 | 7x - 2(3x - 5) + 4 | x - 6 | PARTIAL_DISTRIBUTE
Aug 15 | 5.NBT.B.5 | 47 x 8 | 376, ~50s | SLOW
```

Useless:

```
Aug 15 | struggled with inequalities
```

`x > -3` names one missing rule. "Struggled with inequalities" could be the flip
rule, the arrow, the dot, or the underlying equation solving — four different
fixes, and the entry is worthless for all of them.

**Also log correct answers on previously-missed types.** That is the only signal
a gate is closing.

## The sixth field is worth the two seconds

Every item on every answer key prints a ready-to-paste line like this:

```
log: 2026-08-13 | 7.NS.A.1 | -10 - (-15) |  |  | 2581720956
```

Copy it, fill in the two blanks (what she wrote, then the signature), drop the
`log: ` prefix. That trailing number is the item's seed, and it is the
difference between two kinds of spaced recall:

- **without a seed** — a later session gives her *another problem from the same
  standard*. Useful, but not the one she got wrong.
- **with a seed** — a later session rebuilds *that exact problem*, digit for
  digit. That is what tests whether the gate actually closed, and it is what
  brief.md §7 means by "4 of 5 consecutive correct, on two different dates."

The seed field is a repo extension. brief.md §8 specifies five fields; the sixth
is optional and entries without it still work.

## How this file is read

- Only lines whose **second** field is a real standard code are parsed, and only
  below the marker at the bottom. Headings, prose and the examples above cost
  nothing.
- **Known gap:** `session --from-log` still classifies a miss by looking for the
  words *wrong* or *stuck* in field 5, which was the old free-text format. A log
  written with signatures classifies as zero misses, and `--from-log` quietly
  falls back to an ordinary session. Until that is fixed, either expect the
  fallback or append an outcome word after the signature
  (`NO_FLIP, wrong`) — the parser keeps the whole field.

---

<!-- Real entries below this line. -->
