import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkNoDevLeak } from "../scripts/check-no-dev-leak.mjs";

const check: (distDir: string) => string[] = checkNoDevLeak;

let dist: string;

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), "leak-check-"));
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
  const full = join(dist, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

describe("checkNoDevLeak", () => {
  it.each(["_DEV_", "Lorem Corp", "TODO", "[NEEDS FACT", "XXXX"])(
    "flags %s in a nested dist file",
    (pattern) => {
      write("demos/10k-kb/index.html", `<p>before ${pattern} after</p>`);
      expect(check(dist)).toEqual([`demos/10k-kb/index.html:${pattern}`]);
    },
  );

  it("returns [] for a clean dist", () => {
    write("index.html", "<h1>Clean page</h1>");
    write("_astro/app.js", "console.log('ok')");
    expect(check(dist)).toEqual([]);
  });

  it("reports every pattern in every file, sorted", () => {
    write("b.html", "TODO and XXXX");
    write("a.html", "[NEEDS FACT: x]");
    expect(check(dist)).toEqual(["a.html:[NEEDS FACT", "b.html:TODO", "b.html:XXXX"]);
  });

  it("flags a dev trace file by name even when its contents are clean", () => {
    write("data/traces/_DEV_fixture.json", "{}");
    expect(check(dist)).toEqual(["data/traces/_DEV_fixture.json:_DEV_ (filename)"]);
  });

  it("does not scan binary assets", () => {
    writeFileSync(join(dist, "og.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x54, 0x4f, 0x44, 0x4f]));
    expect(check(dist)).toEqual([]);
  });

  it("throws when the dist directory is missing", () => {
    expect(() => check(join(dist, "nope"))).toThrow();
  });
});
