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
    expect(dev.loadRawTraces().some((t) => t.tickers.includes("XXXX"))).toBe(true);

    const prod = await loadModule(true);
    const traces = prod.loadRawTraces();
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

  it("production build without a synced manifest throws, pointing at the sync script", async () => {
    const { getManifest, loadAllTraces, listFeaturedSlugs } = await loadModule(true);
    for (const fn of [getManifest, loadAllTraces, listFeaturedSlugs]) {
      expect(fn).toThrow(/scripts\/sync-traces\.mjs/);
    }
  });

  it("dev without a synced manifest derives one, featuring the dev fixture", async () => {
    const { resolveManifest, loadAllTraces } = await loadModule(false);
    const traces = loadAllTraces();
    expect(resolveManifest(undefined, traces, false).traces.map((t) => t.slug)).toEqual(
      traces.map((t) => t.slug),
    );
  });
});

describe("featured-only selection", () => {
  async function fixtures() {
    const { loadAllTraces, buildManifest, selectFeatured } = await loadModule(false);
    const base = loadAllTraces()[0];
    const traces: Trace[] = ["feat-a", "plain-b", "feat-c"].map((slug) => ({ ...base, slug }));
    const manifest = buildManifest(traces);
    manifest.traces[1].featured = false;
    return { traces, manifest, selectFeatured };
  }

  it("ignores a trace file whose manifest entry is not featured", async () => {
    const { traces, manifest, selectFeatured } = await fixtures();
    expect(selectFeatured(traces, manifest).map((t) => t.slug)).toEqual(["feat-a", "feat-c"]);
  });

  it("ignores a trace file absent from the manifest entirely", async () => {
    const { traces, manifest, selectFeatured } = await fixtures();
    manifest.traces = manifest.traces.filter((t) => t.slug !== "plain-b");
    expect(selectFeatured(traces, manifest).map((t) => t.slug)).toEqual(["feat-a", "feat-c"]);
  });

  it("throws when a featured manifest slug has no trace file", async () => {
    const { traces, manifest, selectFeatured } = await fixtures();
    expect(() => selectFeatured(traces.slice(1), manifest)).toThrow(/feat-a/);
  });

  it("returns traces in manifest order", async () => {
    const { traces, manifest, selectFeatured } = await fixtures();
    expect(selectFeatured([...traces].reverse(), manifest).map((t) => t.slug)).toEqual(["feat-a", "feat-c"]);
  });
});
