import type { Passage } from "../data/types";

/** Splits included passages into those the answer cites (ascending by `cite`) and those it does not. */
export function splitIncluded(passages: Passage[]): { cited: Passage[]; uncited: Passage[] } {
  const included = passages.filter((p) => p.included);
  const cited = included
    .filter((p) => p.cite !== null)
    .sort((a, b) => (a.cite as number) - (b.cite as number));
  const uncited = included.filter((p) => p.cite === null);
  return { cited, uncited };
}

const ELLIPSIS = "…";

/**
 * Trims the text around a match to at most `limit` characters per side, cutting at a word
 * boundary so no partial word shows. `before` keeps its tail, `after` keeps its head.
 * The match itself is never altered, so it is not part of the result.
 */
export function clipContext(
  ctx: Passage["context"],
  limit = 160
): { before: string; after: string; clipped: boolean } {
  let before = ctx.before;
  let after = ctx.after;
  let clipped = false;

  if (before.length > limit) {
    clipped = true;
    const tail = before.slice(before.length - limit);
    const startsOnBoundary = /\s/.test(before[before.length - limit - 1] ?? "");
    const firstSpace = tail.indexOf(" ");
    const kept = startsOnBoundary || firstSpace === -1 ? tail : tail.slice(firstSpace + 1);
    before = ELLIPSIS + kept.trimStart();
  }
  if (after.length > limit) {
    clipped = true;
    const head = after.slice(0, limit);
    const endsOnBoundary = /\s/.test(after[limit] ?? "");
    const lastSpace = head.lastIndexOf(" ");
    const kept = endsOnBoundary || lastSpace === -1 ? head : head.slice(0, lastSpace);
    after = kept.trimEnd() + ELLIPSIS;
  }
  return { before, after, clipped };
}
