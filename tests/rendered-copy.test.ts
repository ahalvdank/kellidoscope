import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkRenderedCopy, visibleText } from "../scripts/check-rendered-copy.mjs";
import { copyViolations, PJ4_FULL } from "../scripts/copy-rules.mjs";

const page = (body: string, description = "A clean page.") =>
  `<!doctype html><html><head><title>T</title><meta name="description" content="${description}" /></head><body>${body}</body></html>`;

let dist: string;

function write(rel: string, html: string) {
  const file = join(dist, rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, html);
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), "rendered-copy-"));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe("visibleText", () => {
  it("keeps text, the meta description and aria-labels; drops scripts, styles and tags", () => {
    const html = page(
      '<p>Hello <b>there</b> &amp; you</p><div role="img" aria-label="Label here"></div><script>var wrote=1</script><style>.x{}</style>',
      "Meta words",
    );
    const text = visibleText(html);
    expect(text).toContain("Hello there & you");
    expect(text).toContain("Meta words");
    expect(text).toContain("Label here");
    expect(text).not.toContain("wrote");
    expect(text).not.toContain(".x{}");
  });

  it("decodes numeric entities", () => {
    expect(visibleText("<p>R&#233;sum&#xe9;</p>")).toBe("Résumé");
  });
});

describe("checkRenderedCopy", () => {
  it("passes a clean site, including the full PJ4 sentence", () => {
    write("index.html", page(`<p>${PJ4_FULL}.</p>`));
    expect(checkRenderedCopy(dist)).toEqual([]);
  });

  it("fails on a planted violation in visible text", () => {
    write("projects/beckett-diligence/index.html", page("<p>I wrote the orchestrator.</p>"));
    expect(checkRenderedCopy(dist)).toEqual(["projects/beckett-diligence/index.html:wrote-or-coded"]);
  });

  it("fails on a violation that only appears in the meta description", () => {
    write("index.html", page("<p>ok</p>", "A clean-room rewrite"));
    expect(checkRenderedCopy(dist)).toEqual(["index.html:clean-room"]);
  });

  it("fails on 'my team' and on a stale sample size", () => {
    write("projects/10k-kb/index.html", page("<p>I managed my team on the 8-company sample.</p>"));
    expect(checkRenderedCopy(dist)).toEqual([
      "projects/10k-kb/index.html:my-team",
      "projects/10k-kb/index.html:stale-8-company-sample",
    ]);
  });

  it("bans 'production' on the KB, portfolio-manager and home pages only", () => {
    write("index.html", page("<p>in production</p>"));
    write("projects/portfolio-manager/index.html", page("<p>production</p>"));
    write("projects/beckett-diligence/index.html", page("<p>production diligence</p>"));
    expect(checkRenderedCopy(dist)).toEqual([
      "index.html:production",
      "projects/portfolio-manager/index.html:production",
    ]);
  });

  it("skips trace pages under demos/, which quote SEC filings", () => {
    write("demos/10k-kb/q/x/index.html", page("<p>production wrote parity</p>"));
    expect(checkRenderedCopy(dist)).toEqual([]);
  });

  it("ignores banned words inside scripts", () => {
    write("index.html", page("<p>ok</p><script>const parity = 1;</script>"));
    expect(checkRenderedCopy(dist)).toEqual([]);
  });

  it("CLI exits 1 and names the violation", () => {
    write("index.html", page("<p>Matched claim recall was high.</p>"));
    const run = spawnSync(process.execPath, ["scripts/check-rendered-copy.mjs", dist], { encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("index.html:parity");
  });

  it("throws when the directory does not exist", () => {
    expect(() => checkRenderedCopy(join(dist, "missing"))).toThrow();
  });
});

describe("copyViolations", () => {
  it("allows 'engineering team lead' only inside the full PJ4 sentence", () => {
    expect(copyViolations(`${PJ4_FULL}.`)).toEqual([]);
    expect(copyViolations("I was the engineering team lead.")).toEqual(["team-lead-outside-pj4"]);
  });
});
