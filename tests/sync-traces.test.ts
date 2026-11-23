import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncTraces } from "../scripts/sync-traces.mjs";

const sync: (opts: { src?: string; root: string }) => { copied: string[]; skipped: string[] } = syncTraces;

let tmp: string;
let src: string;
let root: string;

const FIXTURE = readFileSync(
  join(__dirname, "..", "scripts", "fixtures", "_DEV_FIXTURE_do_not_ship.json"),
  "utf8",
);

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

function entry(slug: string, featured: boolean) {
  return { slug, title: slug, question: "q?", category: "risk_shift", tickers: ["T"], featured };
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "sync-traces-"));
  src = join(tmp, "exports");
  root = join(tmp, "repo");
  mkdirSync(root);
  writeJson(join(src, "manifest.json"), {
    build_commit: "a".repeat(40),
    sample: { companies: ["T"], filings: 1 },
    traces: [entry("feat-one", true), entry("plain-two", false), entry("feat-three", true)],
  });
  for (const slug of ["feat-one", "plain-two", "feat-three"]) {
    writeJson(join(src, "traces", `${slug}.json`), { slug });
  }
  writeJson(join(src, "traces", "_DEV_FIXTURE_do_not_ship.json"), { slug: "dev" });
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const names = (dir: string) => readdirSync(dir).sort();

describe("syncTraces with SRC", () => {
  it("copies only featured traces plus the manifest to both destinations", () => {
    sync({ src, root });
    for (const dest of ["src/data/traces", "public/data/traces"]) {
      expect(names(join(root, dest)), dest).toEqual(["feat-one.json", "feat-three.json", "manifest.json"]);
    }
  });

  it("does not copy non-featured traces", () => {
    const result = sync({ src, root });
    expect(existsSync(join(root, "src/data/traces/plain-two.json"))).toBe(false);
    expect(existsSync(join(root, "public/data/traces/plain-two.json"))).toBe(false);
    expect(result.skipped).toContain("plain-two");
  });

  it("never copies _DEV_ files, even when the manifest lists one as featured", () => {
    const m = JSON.parse(readFileSync(join(src, "manifest.json"), "utf8"));
    m.traces.push(entry("_DEV_FIXTURE_do_not_ship", true));
    writeJson(join(src, "manifest.json"), m);
    sync({ src, root });
    for (const dest of ["src/data/traces", "public/data/traces"]) {
      expect(names(join(root, dest)).some((n) => n.includes("_DEV_")), dest).toBe(false);
    }
    const copied = JSON.parse(readFileSync(join(root, "public/data/traces/manifest.json"), "utf8"));
    expect(copied.traces.map((t: { slug: string }) => t.slug)).toEqual(["feat-one", "feat-three"]);
  });

  it("filters the copied manifest to featured traces and keeps other fields", () => {
    sync({ src, root });
    const copied = JSON.parse(readFileSync(join(root, "src/data/traces/manifest.json"), "utf8"));
    expect(copied.traces.map((t: { slug: string }) => t.slug)).toEqual(["feat-one", "feat-three"]);
    expect(copied.build_commit).toBe("a".repeat(40));
    expect(copied.sample.filings).toBe(1);
  });

  it("removes stale synced traces but keeps the dev fixture in src", () => {
    mkdirSync(join(root, "src/data/traces"), { recursive: true });
    writeFileSync(join(root, "src/data/traces/_DEV_FIXTURE_do_not_ship.json"), FIXTURE);
    writeJson(join(root, "src/data/traces/old-unfeatured.json"), {});
    writeJson(join(root, "public/data/traces/old-unfeatured.json"), {});
    sync({ src, root });
    expect(existsSync(join(root, "src/data/traces/old-unfeatured.json"))).toBe(false);
    expect(existsSync(join(root, "public/data/traces/old-unfeatured.json"))).toBe(false);
    expect(existsSync(join(root, "src/data/traces/_DEV_FIXTURE_do_not_ship.json"))).toBe(true);
  });

  it("throws, before writing anything, when a featured trace file is missing", () => {
    rmSync(join(src, "traces", "feat-three.json"));
    expect(() => sync({ src, root })).toThrow(/feat-three/);
    expect(existsSync(join(root, "public"))).toBe(false);
  });

  it("throws when the manifest is missing", () => {
    rmSync(join(src, "manifest.json"));
    expect(() => sync({ src, root })).toThrow(/manifest/);
  });

  it("throws when no trace is featured", () => {
    const m = JSON.parse(readFileSync(join(src, "manifest.json"), "utf8"));
    m.traces = m.traces.map((t: { featured: boolean }) => ({ ...t, featured: false }));
    writeJson(join(src, "manifest.json"), m);
    expect(() => sync({ src, root })).toThrow(/featured/);
  });
});

describe("syncTraces without SRC", () => {
  it("copies only the dev fixture, into src/data/traces only", () => {
    sync({ root });
    expect(names(join(root, "src/data/traces"))).toEqual(["_DEV_FIXTURE_do_not_ship.json"]);
    expect(readFileSync(join(root, "src/data/traces/_DEV_FIXTURE_do_not_ship.json"), "utf8")).toBe(FIXTURE);
    expect(existsSync(join(root, "public"))).toBe(false);
  });
});
