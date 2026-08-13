// The error-signature taxonomy from brief.md §5.
//
// This is the catalog half of CATALOG (see CLAUDE.md's operations map). It was
// previously only comments, which meant a typo in a logged signature silently
// became "no miss" rather than an error.
//
// Keep this in step with brief.md §5. brief.md is the source of truth: if a
// genuinely new failure mode appears, add it there first, then here.
//
// Every standard in the taxonomy is listed, including ones this tool does not
// generate items for -- 5.NBT.B.5 is drilled by a separate app, but its
// signatures still have to parse if they turn up in log.md.

import type { Standard } from "./generate.ts";

export const SIGNATURES: Readonly<Record<Standard, readonly string[]>> = {
  "7.NS.A.1": ["DOUBLE_NEG", "SIGN_RULE", "SUBTRACT_ORDER"],
  "5.NBT.B.5": ["PLACE_VALUE", "CARRY", "SLOW"],
  "8.EE.A.1": ["MULT_VS_ADD_EXP", "ZERO_EXP", "NEG_EXP"],
  "8.EE.A.2": ["NON_MAXIMAL_FACTOR", "CUBE_VS_SQUARE", "PERFECT_SQ_RECALL"],
  "7.EE.A.1": ["PARTIAL_DISTRIBUTE", "SIGN_DISTRIBUTE", "UNLIKE_TERMS"],
  "7.EE.B.4": ["NO_FLIP", "OVER_FLIP", "WRONG_ARROW", "WRONG_DOT"],
  "8.EE.C.7b": ["SIGN_MOVE", "COLLECT_WRONG_SIDE"],
  "8.EE.C.8b": ["NO_PARENS_SUB", "ONE_VAR_ONLY", "WRONG_SUB_TARGET"],
  "8.F.A.1": ["OUTPUT_REPEAT", "VLT_MISAPPLY", "VOCAB_TERM"],
  "8.F.B.4": ["RATE_SLOT", "STOPPED_AT_NUMBER", "NO_UNITS", "NO_VAR_DEF"],
};

export const ALL_SIGNATURES: ReadonlySet<string> = new Set(
  Object.values(SIGNATURES).flat(),
);

/**
 * Signatures that record something other than a wrong answer, so they must not
 * trigger a re-drill. brief.md §8's own example is `47 x 8 | 376, ~50s | SLOW`
 * -- the answer was right and slow is a pace problem, not a gap.
 */
export const NOT_A_MISS: ReadonlySet<string> = new Set(["SLOW"]);

/** Signatures look like NO_FLIP or MULT_VS_ADD_EXP. */
const TOKEN = /\b[A-Z][A-Z0-9_]{2,}\b/g;

/** Every signature-shaped token in a log field, known or not. */
export function tokensIn(field: string): string[] {
  return field.match(TOKEN) ?? [];
}

export function isKnown(signature: string): boolean {
  return ALL_SIGNATURES.has(signature);
}

/** Signature-shaped tokens that are not in the taxonomy -- typos, usually. */
export function unrecognized(field: string): string[] {
  return tokensIn(field).filter((t) => !isKnown(t));
}
