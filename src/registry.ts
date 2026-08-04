// The standards that exist so far. Build order steps 5 and 6 add the rest.
//
// Not in spec.md's file tree -- assemble.ts, cli.ts and the tests all need the
// same map, and passing it around or duplicating it in each was worse.

import type { Generator, Standard } from "./generate.ts";

import signedArithmetic from "./standards/7.NS.A.1.ts";
import multiplication from "./standards/5.NBT.B.5.ts";
import exponents from "./standards/8.EE.A.1.ts";
import roots from "./standards/8.EE.A.2.ts";
import functionVocabulary from "./standards/8.F.A.1.ts";

export const REGISTRY: Partial<Record<Standard, Generator>> = {
  "7.NS.A.1": signedArithmetic,
  "5.NBT.B.5": multiplication,
  "8.EE.A.1": exponents,
  "8.EE.A.2": roots,
  "8.F.A.1": functionVocabulary,
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
