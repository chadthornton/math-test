// The standards this tool generates.
//
// 5.NBT.B.5 (multiplication fluency) is deliberately absent. brief.md §3:
// multiplication automaticity is handled by a separate drilling tool and is
// not duplicated here. The standard still exists in the Standard union and in
// the signature taxonomy, so log entries referencing it still parse.
//
// Not in the original file plan -- assemble.ts, cli.ts and the tests all need the
// same map, and passing it around or duplicating it in each was worse.

import type { Generator, Standard } from "./generate.ts";

import signedArithmetic from "./standards/7.NS.A.1.ts";
import exponents from "./standards/8.EE.A.1.ts";
import roots from "./standards/8.EE.A.2.ts";
import functionVocabulary from "./standards/8.F.A.1.ts";
import likeTerms from "./standards/7.EE.A.1.ts";
import inequalities from "./standards/7.EE.B.4.ts";
import bothSides from "./standards/8.EE.C.7b.ts";
import substitution from "./standards/8.EE.C.8b.ts";
import wordProblems from "./standards/8.F.B.4.ts";

export const REGISTRY: Partial<Record<Standard, Generator>> = {
  "7.NS.A.1": signedArithmetic,
  "8.EE.A.1": exponents,
  "8.EE.A.2": roots,
  "8.F.A.1": functionVocabulary,
  "7.EE.A.1": likeTerms,
  "7.EE.B.4": inequalities,
  "8.EE.C.7b": bothSides,
  "8.EE.C.8b": substitution,
  "8.F.B.4": wordProblems,
};

export const BUILT: Standard[] = Object.keys(REGISTRY) as Standard[];

export function generatorFor(name: string): Generator {
  const gen = REGISTRY[name as Standard];
  if (!gen) {
    throw new Error(
      `${name}: not built yet. Available: ${BUILT.join(", ")}`,
    );
  }
  return gen;
}
