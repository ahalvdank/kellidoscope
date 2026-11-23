import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkCspHashes, updateCspHashes } from "../scripts/check-csp-hashes.mjs";

const check: (distDir: string, vercelPath: string) => string[] = checkCspHashes;
const update: (distDir: string, vercelPath: string) => void = updateCspHashes;

const sha = (body: string) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
const LOADER = "(()=>{self.Astro=1})();";
const MODULE = "import('/_astro/x.js')";

let root: string;
let dist: string;
let vercel: string;

function write(rel: string, content: string): void {
  const full = join(dist, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function writeVercel(scriptSrc: string, extraHeaders: object[] = []): void {
  const csp = `default-src 'self'; script-src ${scriptSrc}; style-src 'self'`;
  writeFileSync(
    vercel,
    JSON.stringify({
      headers: [
        {
          source: "/(.*)",
          headers: [{ key: "Content-Security-Policy", value: csp }, ...extraHeaders],
        },
      ],
    }),
  );
}

const scriptSrc = () =>
  /script-src ([^;]*)/.exec(
    JSON.parse(readFileSync(vercel, "utf8")).headers[0].headers[0].value,
  )![1];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "csp-hashes-"));
  dist = join(root, "dist");
  vercel = join(root, "vercel.json");
  mkdirSync(dist);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("checkCspHashes", () => {
  it("passes when every inline script's sha256 is in script-src", () => {
    write("a/index.html", `<script>${LOADER}</script><script type="module">${MODULE}</script>`);
    writeVercel(`'self' https://gc.zgo.at/count.v5.js ${sha(LOADER)} ${sha(MODULE)}`);
    expect(check(dist, vercel)).toEqual([]);
  });

  it("reports an inline script whose hash is missing, naming the file", () => {
    write("a/index.html", `<script>${LOADER}</script>`);
    writeVercel("'self'");
    expect(check(dist, vercel)).toEqual([`missing ${sha(LOADER)} (a/index.html)`]);
  });

  it("reports a hash in script-src that no page uses (stale)", () => {
    write("index.html", `<script>${LOADER}</script>`);
    writeVercel(`'self' ${sha(LOADER)} ${sha("old")}`);
    expect(check(dist, vercel)).toEqual([`stale ${sha("old")}`]);
  });

  it("ignores external scripts and non-executable JSON script blocks", () => {
    write(
      "index.html",
      `<script async src="https://gc.zgo.at/count.v5.js" crossorigin="anonymous"></script>` +
        `<script type="application/ld+json">{"@type":"Person"}</script>` +
        `<script type="application/json">{}</script>`,
    );
    writeVercel("'self' https://gc.zgo.at/count.v5.js");
    expect(check(dist, vercel)).toEqual([]);
  });

  it("hashes the exact bytes between the tags, whitespace included", () => {
    write("index.html", `<script>\n  ${LOADER}\n</script>`);
    writeVercel(`'self' ${sha(LOADER)}`);
    expect(check(dist, vercel)).toEqual([
      `missing ${sha(`\n  ${LOADER}\n`)} (index.html)`,
      `stale ${sha(LOADER)}`,
    ]);
  });

  it.each(["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'"])(
    "rejects %s in script-src",
    (keyword) => {
      write("index.html", "<p>no scripts</p>");
      writeVercel(`'self' ${keyword}`);
      expect(check(dist, vercel)).toEqual([`forbidden ${keyword} in script-src`]);
    },
  );

  it.each(["*", "https:", "http:", "data:"])("rejects the blanket source %s in script-src", (source) => {
    write("index.html", "<p>no scripts</p>");
    writeVercel(`'self' ${source}`);
    expect(check(dist, vercel)).toEqual([`forbidden ${source} in script-src`]);
  });

  it.each(["importmap", "speculationrules"])(
    "requires a hash for an inline <script type=%s>, which CSP gates like any script",
    (type) => {
      const body = '{"imports":{}}';
      write("index.html", `<script type="${type}">${body}</script>`);
      writeVercel("'self'");
      expect(check(dist, vercel)).toEqual([`missing ${sha(body)} (index.html)`]);
    },
  );

  it("does not mistake data-type for the type attribute", () => {
    write("index.html", `<script data-type="application/json">${LOADER}</script>`);
    writeVercel("'self'");
    expect(check(dist, vercel)).toEqual([`missing ${sha(LOADER)} (index.html)`]);
  });

  it("still treats a real type attribute that follows other attributes as data", () => {
    write("index.html", `<script id="x" data-type="module" type="application/ld+json">{}</script>`);
    writeVercel("'self'");
    expect(check(dist, vercel)).toEqual([]);
  });

  it("rejects inline event handler attributes, which hashes cannot allow", () => {
    write("index.html", `<button type="button" onclick="go()">Go</button>`);
    writeVercel("'self'");
    expect(check(dist, vercel)).toEqual(["inline event handler onclick (index.html)"]);
  });

  it("throws when vercel.json has no Content-Security-Policy with script-src", () => {
    writeFileSync(vercel, JSON.stringify({ headers: [] }));
    expect(() => check(dist, vercel)).toThrow(/script-src/);
  });

  it("throws when the dist directory is missing", () => {
    writeVercel("'self'");
    expect(() => check(join(root, "nope"), vercel)).toThrow();
  });
});

describe("updateCspHashes", () => {
  it("replaces the hash set with the current one, keeps other sources and headers, then checks clean", () => {
    write("a/index.html", `<script>${LOADER}</script>`);
    write("b/index.html", `<script>${LOADER}</script><script type="module">${MODULE}</script>`);
    const nosniff = { key: "X-Content-Type-Options", value: "nosniff" };
    writeVercel(`'self' https://gc.zgo.at/count.v5.js ${sha("old")}`, [nosniff]);

    update(dist, vercel);

    expect(scriptSrc()).toBe(
      ["'self'", "https://gc.zgo.at/count.v5.js", ...[sha(LOADER), sha(MODULE)].sort()].join(" "),
    );
    const json = JSON.parse(readFileSync(vercel, "utf8"));
    expect(json.headers[0].headers[1]).toEqual(nosniff);
    expect(json.headers[0].headers[0].value).toMatch(/^default-src 'self'; script-src .*; style-src 'self'$/);
    expect(check(dist, vercel)).toEqual([]);
  });
});

describe("updateCspHashes formatting", () => {
  it("rewrites only the CSP value and leaves the rest of the file byte-identical", () => {
    write("index.html", `<script>${LOADER}</script>`);
    const before = [
      "{",
      '  "headers": [{ "source": "/(.*)", "headers": [',
      `    { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self'" },`,
      '    { "key": "X-Frame-Options", "value": "DENY" }',
      "  ] }]",
      "}",
      "",
    ].join("\n");
    writeFileSync(vercel, before);

    update(dist, vercel);

    expect(readFileSync(vercel, "utf8")).toBe(
      before.replace("script-src 'self';", `script-src 'self' ${sha(LOADER)};`),
    );
  });
});
