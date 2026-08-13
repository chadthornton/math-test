# Session index

One line per emitted set. Append-only -- never edit or reorder, and never let
a tool rewrite a past line.

A set is identified by its whole invocation, not by its seed: `--count` and
`--tier` change the items too. `grade` reads this file to find the set you
are grading, so if a line is missing the set cannot be graded without
retyping the invocation by hand.

```
DATE | COMMAND | seed N | count N | SCOPE | fp XXXXXXXX
```

`SCOPE` is `tier 1,2`, or `standard 7.NS.A.1`, or `-`.

`fp` is a fingerprint over the item seeds. `grade` regenerates the set and
compares. A mismatch means a generator changed since the sheet was printed,
and grading is refused rather than logging her answers against problems she
never saw.

---

<!-- Sessions below this line. -->
2026-08-13 | session | seed 813 | count 12 | tier 1,2 | fp e03f51e5
2026-08-13 | drill | seed 71 | count 20 | standard 7.NS.A.1 | fp dcd86d1e
2026-08-13 | session | seed 813 | count 12 | tier 1,2 | fp e03f51e5
