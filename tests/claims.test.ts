import { describe, expect, it } from "vitest";
import { orderClaims, UNCITED_COLLAPSE_AT, UNCITED_PREVIEW } from "../src/lib/claims";
import type { Claim } from "../src/data/types";

const claim = (entity: string, cite: number | null): Claim => ({
  claim_type: "Risk",
  entity_type: "Risk",
  entity,
  ticker: "XYZ",
  statement: `${entity} statement`,
  raw_extraction: {},
  cite,
});

describe("orderClaims", () => {
  it("cited claims come first, keeping relative order", () => {
    const input = [claim("a", null), claim("b", 2), claim("c", null), claim("d", 1), claim("e", 3)];
    const { cited, uncited } = orderClaims(input);
    expect(cited.map((c) => c.entity)).toEqual(["b", "d", "e"]);
    expect(uncited.map((c) => c.entity)).toEqual(["a", "c"]);
  });

  it("empty input returns empty arrays", () => {
    expect(orderClaims([])).toEqual({ cited: [], uncited: [] });
  });

  it("does not mutate the input", () => {
    const input = [claim("a", null), claim("b", 1)];
    orderClaims(input);
    expect(input.map((c) => c.entity)).toEqual(["a", "b"]);
  });
});

describe("collapse thresholds", () => {
  it("preview shows fewer claims than the collapse threshold", () => {
    expect(UNCITED_PREVIEW).toBe(5);
    expect(UNCITED_COLLAPSE_AT).toBe(8);
  });
});
