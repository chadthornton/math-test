# Error log

Log **observations, not conclusions.** The raw error is irreplaceable; the
diagnosis is reproducible. See brief.md §10.

**Format** — one entry per line, five fields, pipe separated:

```
DATE | STANDARD | PROBLEM AS GIVEN | WHAT SHE WROTE | got stuck / wrong / slow?
```

Good:

```
Aug 6 | 7.EE.B.4 | -3x + 2 > 11 | wrote x > -3 | wrong, no flip
Aug 6 | 7.EE.A.1 | 7x - 2(3x - 5) + 4 | wrote x - 6 | wrong, dropped 2nd distribute
Aug 6 | 5.NBT.B.5 | 47 x 8 | correct but ~50s | slow, not wrong
```

Useless:

```
Aug 6 | struggled with inequalities
```

**Also log what she gets right after previously missing it.** That is the
signal a gate has actually closed.

Two notes on how this file is read by the generator:

- `session --from-log` counts an entry as a miss when the last field contains
  **wrong** or **stuck**. `slow, not wrong` is deliberately not a miss.
- Entries above the rule below are examples and are ignored — only lines whose
  second field is a real standard code are parsed, so headings and prose here
  cost nothing.

---

<!-- Real entries below this line. -->
