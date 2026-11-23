import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { EXPORTS_DIR, HAVE_EXPORTS } from "./helpers";

const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "src", "data", "traces");
const PUBLIC_DIR = join(ROOT, "public", "data", "traces");
/** Ruling: per-trace JSON budget, gzipped (replaces the plan's 40 KB). */
const MAX_GZIP_BYTES = 100 * 1024;

type ManifestEntry = { slug: string; featured: boolean };
const readManifest = (dir: string): { traces: ManifestEntry[] } =>
  JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const featuredSlugs = (dir: string) =>
  readManifest(dir).traces.filter((t) => t.featured).map((t) => t.slug);

describe("synced trace files", () => {
  it.skipIf(!HAVE_EXPORTS)(
    "src and public copies match the filings-kb featured exports byte for byte",
    () => {
      const slugs = featuredSlugs(EXPORTS_DIR);
      expect(slugs.length).toBeGreaterThan(0);
      for (const dir of [SRC_DIR, PUBLIC_DIR]) {
        // The sync script writes the export manifest with its traces filtered to featured ones.
        const exported = JSON.parse(readFileSync(join(EXPORTS_DIR, "manifest.json"), "utf8"));
        const synced = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
        expect(synced).toEqual({ ...exported, traces: exported.traces.filter((t: ManifestEntry) => t.featured) });
        for (const slug of slugs) {
          const synced = readFileSync(join(dir, `${slug}.json`));
          const exported = readFileSync(join(EXPORTS_DIR, "traces", `${slug}.json`));
          // Buffer.equals: a toEqual diff of megabyte buffers is pathologically slow.
          expect(synced.equals(exported), `${dir}/${slug} differs from export`).toBe(true);
        }
      }
    },
  );

  it("public/data/traces holds exactly the featured traces plus the manifest", () => {
    const expected = [...featuredSlugs(PUBLIC_DIR).map((s) => `${s}.json`), "manifest.json"].sort();
    expect(readdirSync(PUBLIC_DIR).sort()).toEqual(expected);
  });

  it("every featured trace JSON is at most 100 KB gzipped", () => {
    for (const slug of featuredSlugs(PUBLIC_DIR)) {
      const gz = gzipSync(readFileSync(join(PUBLIC_DIR, `${slug}.json`))).length;
      expect(gz, `${slug}: ${gz} bytes gzipped`).toBeLessThanOrEqual(MAX_GZIP_BYTES);
    }
  });
});
