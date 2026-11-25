import { describe, expect, it } from "vitest";
import { bucketFor, ENTITY_BUCKETS, getClaimBucket, getEntityBucket } from "../src/data/entityBuckets";
import type { ClaimType } from "../src/data/types";

const EXPECTED: Record<string, string> = {
  Company: "company",
  Filing: "company",
  Security: "company",
  RevenueSegment: "company",
  Risk: "risk",
  MaterialEvent: "risk",
  LegalProceeding: "risk",
  CapitalStructureEvent: "capital",
  CapitalReturn: "capital",
  GuidanceUpdate: "capital",
  Person: "people",
  InsiderTransaction: "people",
  ESGCommitment: "people",
  Factor: "research",
  Technique: "research",
  ResearchSource: "research",
  Regime: "research",
  ThesisPage: "research",
};

describe("bucketFor", () => {
  it('maps all 18 internal types and unknown → "other"', () => {
    expect(Object.keys(EXPECTED)).toHaveLength(18);
    for (const [type, bucket] of Object.entries(EXPECTED)) {
      expect(bucketFor(type), type).toBe(bucket);
    }
    expect(bucketFor("SomethingNew")).toBe("other");
    expect(bucketFor("")).toBe("other");
  });

  it("does not resolve Object.prototype keys as buckets", () => {
    expect(bucketFor("constructor")).toBe("other");
    expect(bucketFor("toString")).toBe("other");
  });

  it("has display metadata for every bucket, including other", () => {
    for (const id of ["company", "risk", "capital", "people", "research", "other"] as const) {
      expect(ENTITY_BUCKETS[id].id).toBe(id);
      expect(ENTITY_BUCKETS[id].label.length).toBeGreaterThan(0);
    }
    expect(getEntityBucket("SomethingNew").id).toBe("other");
    expect(getEntityBucket("Risk").id).toBe("risk");
  });
});

const CLAIM_TYPES: ClaimType[] = [
  "Risk",
  "MaterialEvent",
  "CapitalStructureEvent",
  "LegalProceeding",
  "CapitalReturn",
  "GuidanceUpdate",
  "RevenueSegment",
  "ESGCommitment",
  "InsiderTransaction",
];

describe("getClaimBucket", () => {
  it("Risk, MaterialEvent, LegalProceeding and ESGCommitment map to four different buckets", () => {
    const ids = (["Risk", "MaterialEvent", "LegalProceeding", "ESGCommitment"] as const).map(
      (t) => getClaimBucket(t, "Company").id
    );
    expect(new Set(ids).size).toBe(4);
  });

  it("every ClaimType maps to a bucket", () => {
    for (const t of CLAIM_TYPES) {
      const bucket = getClaimBucket(t, "SomethingNew");
      expect(bucket, t).toBe(ENTITY_BUCKETS[bucket.id]);
      expect(bucket.id, t).not.toBe("other");
    }
  });

  it("an unknown claim type falls back to the entity-type bucket", () => {
    expect(getClaimBucket("NotAClaimType", "Risk").id).toBe("risk");
    expect(getClaimBucket(null, "Person").id).toBe("people");
    expect(getClaimBucket(undefined, "SomethingNew").id).toBe("other");
    expect(getClaimBucket("constructor", "Filing").id).toBe("company");
  });
});
