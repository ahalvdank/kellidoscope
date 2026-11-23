import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateManifest, validateTrace } from "../src/data/validate";
import { EXPORTS_DIR, HAVE_EXPORTS, SCHEMAS_DIR } from "./helpers";

const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const FIXTURE = join(__dirname, "..", "scripts", "fixtures", "_DEV_FIXTURE_do_not_ship.json");
const SRC_FIXTURE = join(__dirname, "..", "src", "data", "traces", "_DEV_FIXTURE_do_not_ship.json");
const LOCAL_SCHEMAS = join(__dirname, "..", "src", "data", "schemas");

describe("validators", () => {
  it("accept the dev fixture", () => {
    expect(validateTrace(readJson(FIXTURE))).toEqual([]);
  });

  it("keeps both dev fixture copies identical", () => {
    expect(readFileSync(SRC_FIXTURE, "utf8")).toBe(readFileSync(FIXTURE, "utf8"));
  });

  it("reject a trace missing a required meta field, naming the path", () => {
    const t = readJson(FIXTURE);
    delete t.meta.max_passages;
    const errors = validateTrace(t);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("max_passages");
  });

  it("reject an unknown passage form and an undeclared field", () => {
    const t = readJson(FIXTURE);
    t.passages[0].form = "8-K";
    t.surprise = true;
    const text = validateTrace(t).join("\n");
    expect(text).toContain("/passages/0/form");
    expect(text).toContain("surprise");
  });

  it("reject a manifest whose build_commit is not a 40-char sha", () => {
    expect(validateManifest({ build_commit: "2a37b2c" }).join("\n")).toContain("build_commit");
  });
});

describe.skipIf(!HAVE_EXPORTS)("real filings-kb exports", () => {
  const traceFiles = HAVE_EXPORTS
    ? readdirSync(join(EXPORTS_DIR, "traces")).filter((f) => f.endsWith(".json"))
    : [];
  const manifest = HAVE_EXPORTS ? readJson(join(EXPORTS_DIR, "manifest.json")) : null;

  it("local schema copies are byte-identical to the pipeline's", () => {
    for (const f of ["trace.schema.json", "manifest.schema.json"]) {
      expect(readFileSync(join(LOCAL_SCHEMAS, f), "utf8"), f).toBe(
        readFileSync(join(SCHEMAS_DIR, f), "utf8"),
      );
    }
  });

  it("manifest validates and always carries a boolean featured flag", () => {
    expect(validateManifest(manifest)).toEqual([]);
    for (const t of manifest.traces) expect(typeof t.featured, t.slug).toBe("boolean");
    expect(manifest.sample.filings).toBe(61);
  });

  it("has a trace file for every manifest slug and vice versa", () => {
    expect(traceFiles.map((f) => f.replace(/\.json$/, "")).sort()).toEqual(
      manifest.traces.map((t: { slug: string }) => t.slug).sort(),
    );
  });

  it.each(traceFiles)("%s validates against the trace types", (file) => {
    const trace = readJson(join(EXPORTS_DIR, "traces", file));
    expect(validateTrace(trace)).toEqual([]);
    expect(trace.slug).toBe(file.replace(/\.json$/, ""));
    expect(trace.meta.build_commit).toBe(manifest.build_commit);
  });
});
