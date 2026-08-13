// The standards this tool generates.
//
// 5.NBT.B.5 covers the multi-digit ALGORITHM only (smallest item: 12 x 2).
// The 1-10 times table is drilled by a separate app -- brief.md §3's
// "automaticity" -- and is never generated here.
//
// Not in the original file plan -- assemble.ts, cli.ts and the tests all need the
// same map, and passing it around or duplicating it in each was worse.

import type { Generator, Standard } from "./generate.ts";

import signedArithmetic from "./standards/7.NS.A.1.ts";
import multiplication from "./standards/5.NBT.B.5.ts";
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
  "5.NBT.B.5": multiplication,
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
