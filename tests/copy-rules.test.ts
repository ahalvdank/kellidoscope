import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Every public sentence must trace to an agreed fact. These rules catch the known ways copy drifts:
// wrong role wording, scrubbed Beckett data, stale sample numbers, a parity figure, missing
// disclaimers and a missing sentiment-truncation disclosure.

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

const PJ4_AGENTS = "AI coding agents worked like my staff engineers and wrote most of the code";
const PJ4_FULL = `I was the architect, product manager and engineering team lead; ${PJ4_AGENTS}`;
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

describe.each(ALL_COPY)("global copy rules: %s", (rel) => {
  const text = read(rel);

  it("never says Andrew wrote or coded anything (only the PJ4 agents clause may say 'wrote')", () => {
    const withoutAllowed = text.split(PJ4_AGENTS).join("");
    expect(withoutAllowed).not.toMatch(/\bwrote\b|\bcoded\b/i);
  });

  it("uses 'engineering team lead' only inside the full PJ4 sentence", () => {
    const leads = text.match(/engineering team lead/gi) ?? [];
    const full = text.split(PJ4_FULL).length - 1;
    expect(leads.length).toBe(full);
  });

  it("names no data vendor and no Beckett deal figure", () => {
    expect(text).not.toMatch(/PitchBook|Mintel|IBISWorld|Euromonitor|\$4M|\$50M|8 deals|6 closed|SPV/);
  });

  it("drops 'partner permission'", () => {
    expect(text).not.toMatch(/partner permission/i);
  });

  it("has no unfilled fact marker", () => {
    expect(text).not.toContain("[NEEDS FACT");
  });

  it("never calls the public repo a clean-room rewrite", () => {
    expect(text).not.toMatch(/clean[- ]?room/i);
  });

  it("publishes no parity eval or matched-claim recall figure", () => {
    expect(text).not.toMatch(/parity/i);
    expect(text).not.toMatch(/matched[- ]claim recall/i);
    expect(text).not.toMatch(/\b(87\.3|97\.1|77\.8|79\.5|86\.4|84\.8|95\.9|73\.6|84\.1)%/);
  });
});

describe.each([...PAGE_COPY, ...ASTRO_SOURCES])("rendered copy rules: %s", (rel) => {
  const text = read(rel);

  it("uses the 12-company, 61-filing sample, not the bundle's 8-company draft", () => {
    expect(text).not.toMatch(/8[- ]compan|16[- ]filing|16 10-Ks/i);
  });

  it("drops the blind-tasting repo statistics", () => {
    expect(text).not.toMatch(/68 test files/i);
  });
});

describe("sentiment truncation is disclosed wherever sentiment is described", () => {
  // Diagrams are labels inside a figure; the page copy around them carries the disclosure.
  const files = [...PAGE_COPY, ...PAGES, "src/components/EvalsLedger.astro", "src/components/TraceViewer.tsx"];
  it.each(files)("%s", (rel) => {
    const text = read(rel);
    if (/FinBERT|sentiment/i.test(text)) expect(text).toMatch(/truncat/i);
  });

  it("the 10-K copy states the measured truncation share", () => {
    expect(read("content/copy-10k-kb.md")).toMatch(/747 of the 2,898 chunks/);
  });
});

describe("no 'production' for the 10-K KB or the portfolio manager", () => {
  it.each([
    "content/copy-10k-kb.md",
    "content/copy-portfolio-manager.md",
    "content/architecture-matrix.md",
    "src/pages/projects/10k-kb.astro",
    "src/pages/projects/portfolio-manager.astro",
    "src/components/EvalsLedger.astro",
  ])("%s", (rel) => {
    expect(read(rel)).not.toMatch(/production/i);
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

  it("the top bar says Résumé", () => {
    const topBar = read("src/components/TopBar.astro");
    expect(topBar).toContain("Résumé");
    expect(topBar).not.toContain("Resume PDF");
  });
});
