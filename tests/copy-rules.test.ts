import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { copyViolations, PJ4_FULL } from "../scripts/copy-rules.mjs";

// Every public sentence must trace to an agreed fact. These rules catch the known ways copy drifts:
// wrong role wording, scrubbed Beckett data, stale sample numbers, a parity figure, missing
// disclaimers and a missing sentiment-truncation disclosure. The banned patterns live in
// scripts/copy-rules.mjs, which scripts/check-rendered-copy.mjs also runs over the built pages.

const ROOT = join(__dirname, "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

function walk(dir: string, ext: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) return walk(rel, ext);
    return entry.name.endsWith(ext) ? [relative(ROOT, join(ROOT, rel))] : [];
  });
}

const CONTENT_MD = readdirSync(join(ROOT, "content"))
  .filter((name) => name.endsWith(".md"))
  .map((name) => `content/${name}`);

/** The copy files the site renders. */
const PAGE_COPY = [
  "content/copy-home.md",
  "content/copy-10k-kb.md",
  "content/copy-beckett-diligence.md",
  "content/copy-portfolio-manager.md",
  "content/architecture-matrix.md",
];

const PAGES = [
  "src/pages/index.astro",
  "src/pages/projects/10k-kb.astro",
  "src/pages/projects/beckett-diligence.astro",
  "src/pages/projects/portfolio-manager.astro",
  "src/pages/404.astro",
];

/** Sources that can hold visible copy: pages and components, including the TraceViewer island. */
const ASTRO_SOURCES = [
  ...walk("src/pages", ".astro"),
  ...walk("src/components", ".astro"),
  ...walk("src/components", ".tsx"),
];

/** Everything the global rules apply to. */
const ALL_COPY = [...CONTENT_MD, ...ASTRO_SOURCES];

const BECKETT_ROLE = "designed, directed and approved";
const BECKETT_DISCLAIMER = "All deal data, company names and fund figures omitted.";
const PM_DISCLAIMER = "Personal research project; not investment advice.";
const PJ3 =
  "A phone-motion practice round for the Wine Professional Level III deductive tasting exam: swirl, nose and sip a simulated glass, fill in the tasting sheet, and get a 25-point scored report.";
const PJ3A =
  "A journal of my own tastings with stock tracking, a 3D cellar of photo-labelled bottles and an atlas of wine regions.";

describe("copy-rules inputs", () => {
  it("finds every page, every rendered copy file and the components", () => {
    for (const rel of [...PAGE_COPY, ...PAGES]) expect(ALL_COPY).toContain(rel);
    expect(ALL_COPY).toContain("src/components/EvalsLedger.astro");
    expect(ALL_COPY).toContain("src/components/TopBar.astro");
    expect(ALL_COPY).toContain("src/components/TraceViewer.tsx");
  });
});

// Rule ids are listed in scripts/copy-rules.mjs; tests/rendered-copy.test.ts covers each one.
describe("global copy rules", () => {
  it.each(ALL_COPY)("%s", (rel) => {
    expect(copyViolations(read(rel))).toEqual([]);
  });
});

describe("rendered copy rules (sample size, repo statistics)", () => {
  it.each([...PAGE_COPY, ...ASTRO_SOURCES])("%s", (rel) => {
    expect(copyViolations(read(rel), { rendered: true })).toEqual([]);
  });
});

describe("sentiment truncation is disclosed where signals are described", () => {
  // Ruling T5 r1 (minor 11): on the 10-K page the disclosure lives in Signals and Known limits
  // only. The matrix and the diagram render on that same page, so they are exempt.
  const EXEMPT = new Set(["content/architecture-matrix.md"]);
  const files = [...PAGE_COPY, ...PAGES, "src/components/EvalsLedger.astro", "src/components/TraceViewer.tsx"];
  it.each(files.filter((rel) => !EXEMPT.has(rel)))("%s", (rel) => {
    const text = read(rel);
    if (/FinBERT|sentiment/i.test(text)) expect(text).toMatch(/truncat/i);
  });

  it("the 10-K copy states the truncation share in both Signals and Known limits", () => {
    const copy = read("content/copy-10k-kb.md");
    const signals = copy.slice(copy.indexOf("## Filing signals"), copy.indexOf("## The public rewrite"));
    const limits = copy.slice(copy.indexOf("## Known limits"));
    expect(signals).toMatch(/747 of the 2,898 chunks/);
    expect(limits).toMatch(/747 of the 2,898 chunks/);
  });

  it("the matrix no longer carries its own truncation footnote", () => {
    expect(read("content/architecture-matrix.md")).not.toMatch(/truncat/i);
  });
});

describe("no 'production' for the 10-K KB or the portfolio manager", () => {
  it.each([
    "content/copy-home.md",
    "content/copy-10k-kb.md",
    "content/copy-portfolio-manager.md",
    "content/architecture-matrix.md",
    "src/pages/index.astro",
    "src/pages/projects/10k-kb.astro",
    "src/pages/projects/portfolio-manager.astro",
    "src/components/EvalsLedger.astro",
    "src/components/LiveFinding.astro",
    "src/components/TelegramApprovalPreview.astro",
    "src/components/PortfolioClip.astro",
  ])("%s", (rel) => {
    expect(copyViolations(read(rel), { production: true })).toEqual([]);
  });
});

describe("role wording", () => {
  it.each(["content/copy-10k-kb.md", "content/copy-portfolio-manager.md", "content/copy-home.md"])(
    "%s carries the full PJ4 sentence",
    (rel) => {
      expect(read(rel)).toContain(PJ4_FULL);
    },
  );

  it("Beckett is designed, directed and approved", () => {
    expect(read("content/copy-beckett-diligence.md")).toContain(BECKETT_ROLE);
  });
});

describe("fixed copy", () => {
  it("Beckett carries its disclaimer", () => {
    expect(read("content/copy-beckett-diligence.md")).toContain(BECKETT_DISCLAIMER);
  });

  it("the portfolio manager carries its disclaimer and the PJ2 facts", () => {
    const pm = read("content/copy-portfolio-manager.md");
    expect(pm).toContain(PM_DISCLAIMER);
    expect(pm).toMatch(/in daily use/i);
    expect(pm).toContain("trades some live money");
    expect(pm).toContain("paper trading / shadow mode");
    expect(pm).toMatch(/running since spring 2025/i);
  });

  it("home wine cards use the PJ3 and PJ3a sentences and the agreed link labels", () => {
    const home = read("content/copy-home.md");
    expect(home).toContain(PJ3);
    expect(home).toContain(PJ3A);
    expect(home).toContain("label: Play it");
    expect(home).toContain("label: Code");
    expect(home).toContain("label: Open the demo collection");
  });

  it("home carries the class-tasting card from PJ3b", () => {
    const home = read("content/copy-home.md");
    expect(home).toContain(
      "A shared tasting sheet for a wine class: the instructor reveals each wine, every student's Wine Professional 25-point sheet is scored against the answer key, each student sees why they gained or lost each point, and the class sees an anonymous comparison. Students can never read the answer key.",
    );
    expect(home).toContain("Built for a Level III class; first pilot not yet run.");
    expect(home).toContain("label: See how it works");
    expect(home).toContain("href: classTastingApp");
    // The demo link comes first (it renders as the primary button) and is counted as "demo-class".
    expect(home).toContain("- label: Try the demo class\n          href: classTastingDemo\n          event: demo-class");
    expect(home.indexOf("label: Try the demo class")).toBeLessThan(home.indexOf("label: See how it works"));
    // Only the blind-tasting card has a Code link: the class-tasting repo is private.
    expect(home.match(/label: Code/g)).toHaveLength(1);
  });

  it("home hero uses the agreed headline", () => {
    expect(read("content/copy-home.md")).toContain(
      "I design and ship AI systems for financial research, venture diligence, and investing.",
    );
  });

  it("home carries the agreed card metrics", () => {
    const home = read("content/copy-home.md");
    expect(home).toContain("973 filings · 186 companies");
    expect(home).toContain("~60h → ~25h per deal");
    expect(home).toContain("Daily use since spring 2025");
  });

  it("the Beckett card keeps its sample size", () => {
    expect(read("content/copy-home.md")).toContain("4 deals before and 4 after");
  });

  it("the top bar links Wine apps to the home section", () => {
    const topBar = read("src/components/TopBar.astro");
    expect(topBar.split('href="/#wine-apps"')).toHaveLength(3); // desktop and phone nav
    expect(topBar).toContain("Wine apps");
  });

  it("the top bar says Résumé", () => {
    const topBar = read("src/components/TopBar.astro");
    expect(topBar).toContain("Résumé");
    expect(topBar).not.toContain("Resume PDF");
  });
});
