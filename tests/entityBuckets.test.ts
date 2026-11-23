import { describe, expect, it } from "vitest";
import { bucketFor, ENTITY_BUCKETS, getEntityBucket } from "../src/data/entityBuckets";

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
