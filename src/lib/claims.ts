import type { Claim } from "../data/types";

/** Uncited claims shown before the "Show all" button when the list is collapsed. */
export const UNCITED_PREVIEW = 5;
/** Collapse only when there are more uncited claims than this. */
export const UNCITED_COLLAPSE_AT = 8;

/** Splits claims into those the answer cites and those it does not, each keeping its original order. */
export function orderClaims(claims: Claim[]): { cited: Claim[]; uncited: Claim[] } {
  return {
    cited: claims.filter((c) => c.cite !== null),
    uncited: claims.filter((c) => c.cite === null),
  };
}
