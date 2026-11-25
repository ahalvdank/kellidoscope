import { describe, expect, it } from "vitest";
import { getTrace } from "../src/data/traces";
import type { Passage } from "../src/data/types";
import { clipContext, splitIncluded } from "../src/lib/passages";

const BASE_PASSAGE = getTrace("ba-liquidity-and-debt-fy24-fy25").passages[0];
const p = (over: Partial<Passage>): Passage => ({ ...BASE_PASSAGE, included: true, ...over });

describe("splitIncluded", () => {
  it("orders cited passages by cite number and drops excluded ones", () => {
    const ps = [p({ cite: 3 }), p({ cite: null }), p({ cite: 1 }), p({ cite: 2, included: false })];
    const { cited, uncited } = splitIncluded(ps);
    expect(cited.map((x) => x.cite)).toEqual([1, 3]);
    expect(uncited).toHaveLength(1);
  });
  it("returns empty arrays for no passages", () =>
    expect(splitIncluded([])).toEqual({ cited: [], uncited: [] }));
  it("keeps uncited passages in input order", () => {
    const a = p({ cite: null, accession: "a" });
    const b = p({ cite: null, accession: "b" });
    expect(splitIncluded([b, a]).uncited.map((x) => x.accession)).toEqual(["b", "a"]);
  });
});

describe("clipContext", () => {
  it("keeps short context untouched", () =>
    expect(clipContext({ before: "a b", match: "M", after: "c" })).toEqual({
      before: "a b",
      after: "c",
      clipped: false,
    }));
  it("clips before to its tail and after to its head at word boundaries", () => {
    const long = Array.from({ length: 80 }, (_, i) => `w${i}`).join(" ");
    const r = clipContext({ before: long, match: "M", after: long });
    expect(r.clipped).toBe(true);
    expect(r.before.startsWith("…")).toBe(true);
    expect(r.before.length).toBeLessThanOrEqual(161);
    expect(r.before.endsWith("w79")).toBe(true);
    expect(r.after.endsWith("…")).toBe(true);
    expect(r.after.startsWith("w0")).toBe(true);
  });
  it("never shows a partial word at either cut", () => {
    const long = Array.from({ length: 80 }, (_, i) => `w${i}`).join(" ");
    const r = clipContext({ before: long, match: "M", after: long });
    for (const tok of r.before.slice(1).trim().split(" ")) expect(tok).toMatch(/^w\d+$/);
    for (const tok of r.after.slice(0, -1).trim().split(" ")) expect(tok).toMatch(/^w\d+$/);
  });
  it("clips only the side that is too long", () => {
    const long = "word ".repeat(100).trim();
    const r = clipContext({ before: "short", match: "M", after: long });
    expect(r.before).toBe("short");
    expect(r.after.endsWith("…")).toBe(true);
    expect(r.clipped).toBe(true);
  });
  it("treats text exactly at the limit as not clipped", () =>
    expect(clipContext({ before: "x".repeat(160), match: "M", after: "y".repeat(160) }).clipped).toBe(false));
});
