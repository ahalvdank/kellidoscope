import { describe, expect, it } from "vitest";
import { FRAMING_BANNER, sampleBadge } from "../src/lib/badge";
import manifest from "../src/data/traces/manifest.json";

describe("sampleBadge", () => {
  it("matches the fixed badge copy for the synced manifest", () => {
    expect(sampleBadge(manifest)).toBe(
      "Sample: 12 companies · 61 filings | Full private system: 186 companies · 973 filings.",
    );
  });

  it("follows the manifest it is given", () => {
    const badge = sampleBadge({
      sample: { companies: ["AAA", "BBB"], filings: 3 },
      full_corpus: { companies: 5, filings: 9 },
    });
    expect(badge).toBe("Sample: 2 companies · 3 filings | Full private system: 5 companies · 9 filings.");
  });
});

describe("FRAMING_BANNER", () => {
  it("is the fixed framing copy", () => {
    expect(FRAMING_BANNER).toBe("Deterministic replay of real pipeline runs: zero live API latency or cost.");
  });
});
