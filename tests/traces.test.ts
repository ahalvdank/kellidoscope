import { afterEach, describe, expect, it, vi } from "vitest";
import type { Trace } from "../src/data/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadModule(prod: boolean) {
  vi.stubEnv("PROD", prod);
  vi.resetModules();
  return import("../src/data/traces");
}

describe("trace loader", () => {
  it("production glob excludes _DEV_ files", async () => {
    const dev = await loadModule(false);
    expect(dev.loadAllTraces().some((t) => t.tickers.includes("XXXX"))).toBe(true);

    const prod = await loadModule(true);
    const traces = prod.loadAllTraces();
    expect(traces.some((t) => t.tickers.includes("XXXX"))).toBe(false);
    expect(JSON.stringify(traces)).not.toContain("Lorem Corp");
  });

  it("sample.filings counts unique accessions, not companies × 2", async () => {
    const { loadAllTraces, buildManifest } = await loadModule(false);
    const base = loadAllTraces()[0];
    const a: Trace = { ...base, slug: "a-trace", tickers: ["AAAA"] };
    const b: Trace = { ...base, slug: "b-trace", tickers: ["BBBB"] };
    const c: Trace = { ...base, slug: "c-trace", tickers: ["CCCC"] };
    const unique = new Set(base.passages.map((p) => p.accession)).size;

    const manifest = buildManifest([a, b, c]);
    expect(manifest.sample.companies).toEqual(["AAAA", "BBBB", "CCCC"]);
    expect(manifest.sample.filings).toBe(unique);
    expect(manifest.sample.filings).not.toBe(manifest.sample.companies.length * 2);
  });

  it("every manifest slug has a trace file", async () => {
    const { getManifest, getTrace } = await loadModule(false);
    const manifest = getManifest();
    expect(manifest.traces.length).toBeGreaterThan(0);
    for (const entry of manifest.traces) {
      expect(getTrace(entry.slug).slug).toBe(entry.slug);
    }
  });

  it("getTrace throws for an unknown slug", async () => {
    const { getTrace } = await loadModule(false);
    expect(() => getTrace("no-such-trace")).toThrow(/no-such-trace/);
  });

  it("listFeaturedSlugs returns only featured manifest entries", async () => {
    const { getManifest, listFeaturedSlugs } = await loadModule(false);
    const expected = getManifest().traces.filter((t) => t.featured).map((t) => t.slug);
    expect(listFeaturedSlugs()).toEqual(expected);
    expect(expected.length).toBeGreaterThan(0);
  });

  it("production build with no synced traces yields an empty manifest, not an error", async () => {
    const { getManifest, listFeaturedSlugs } = await loadModule(true);
    expect(getManifest().traces).toEqual([]);
    expect(listFeaturedSlugs()).toEqual([]);
  });
});
