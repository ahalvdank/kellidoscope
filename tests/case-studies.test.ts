import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import EvalsLedger from "../src/components/EvalsLedger.astro";
import { PJ4_FULL } from "../scripts/copy-rules.mjs";

const copy = readFileSync("content/copy-10k-kb.md", "utf8");
const body = copy.replace(/^---\n[\s\S]*?\n---\n/, "");
const headingIndex = (h: string) => body.indexOf(`\n## ${h}\n`);

describe("10-K case study copy", () => {
  it("the 10-K intro no longer opens with the role sentence", () => {
    const intro = body.slice(0, body.indexOf("\n## "));
    expect(intro).not.toContain(PJ4_FULL);
    expect(copy).toContain(PJ4_FULL);
  });

  it("the 10-K My role section sits between The public rewrite and Known limits", () => {
    const rewrite = headingIndex("The public rewrite");
    const role = headingIndex("My role");
    const limits = headingIndex("Known limits");
    expect(rewrite).toBeGreaterThan(-1);
    expect(role).toBeGreaterThan(rewrite);
    expect(limits).toBeGreaterThan(role);
    expect(body.slice(role, limits)).toContain(PJ4_FULL);
  });
});

describe("EvalsLedger", () => {
  it("renders the 8 measured rows in the table and the 4 v2 evals as one summary line", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(EvalsLedger);
    const tbody = html.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? "";
    expect(tbody.match(/<tr[\s>]/g)).toHaveLength(8);
    expect(tbody).not.toContain("Planned: v2");
    const summaries = html.match(/<p[^>]*>[^<]*Planned for v2:[^<]*<\/p>/g) ?? [];
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toContain(
      "Planned for v2: retrieval recall@k, citation faithfulness, a claim-extraction audit, and cost per 10-K ingested. They get numbers when they are measured.",
    );
    for (const name of ["Retrieval recall@k", "Citation faithfulness", "Claim extraction audit", "Cost per 10-K ingested"]) {
      expect(tbody).not.toContain(name);
    }
  });
});

describe("Beckett and Portfolio Manager case study copy", () => {
  const beckett = readFileSync("content/copy-beckett-diligence.md", "utf8");
  const beckettBody = beckett.replace(/^---\n[\s\S]*?\n---\n/, "");
  const pm = readFileSync("content/copy-portfolio-manager.md", "utf8");
  const pmBody = pm.replace(/^---\n[\s\S]*?\n---\n/, "");
  const at = (text: string, h: string) => text.indexOf(`\n## ${h}\n`);

  it("PM intro no longer opens with the role sentence; a My role section follows How it works", () => {
    const intro = pmBody.slice(0, pmBody.indexOf("\n## "));
    expect(intro).not.toContain(PJ4_FULL);
    const how = at(pmBody, "How it works");
    const role = at(pmBody, "My role");
    const leaves = at(pmBody, "What this page leaves out");
    expect(how).toBeGreaterThan(-1);
    expect(role).toBeGreaterThan(how);
    expect(leaves).toBeGreaterThan(role);
    expect(pmBody.slice(role, leaves)).toContain(PJ4_FULL);
  });

  it("Beckett My role follows How it works", () => {
    const how = at(beckettBody, "How it works");
    const engineering = beckettBody.indexOf("\n### Engineering\n");
    const role = at(beckettBody, "My role");
    const evaluation = at(beckettBody, "Evaluation");
    expect(how).toBeGreaterThan(-1);
    expect(role).toBeGreaterThan(engineering);
    expect(engineering).toBeGreaterThan(how);
    expect(evaluation).toBeGreaterThan(role);
    expect(beckettBody.slice(role, evaluation)).toContain("designed, directed and approved");
  });

  it("neither page renders an amber disclaimer box but both keep the disclaimer as a quiet italic note", () => {
    for (const file of ["beckett-diligence", "portfolio-manager"]) {
      const src = readFileSync(`src/pages/projects/${file}.astro`, "utf8");
      expect(src).not.toContain("bg-amber-50");
      expect(src).toMatch(/<p[^>]*\bitalic\b[^>]*\btext-xs\b[^>]*>\{data\.disclaimer\}<\/p>|<p[^>]*\btext-xs\b[^>]*\bitalic\b[^>]*>\{data\.disclaimer\}<\/p>/);
    }
  });

  it("Beckett copy carries the corrected orchestrator and retrospective bullets", () => {
    expect(beckett).toContain(
      "**One orchestrator,** in custom Python rather than an agent framework, runs the stages. The model writes its reasoning to a separate journal, with my responses, so the reasoning can be reviewed independently of the result.",
    );
    expect(beckett).toContain(
      "**A retrospective** reviews that journal after a deal and records lessons for the next diligence; so far I have run it by hand.",
    );
    expect(beckett).not.toContain("It writes its reasoning out separately");
    expect(beckett).not.toContain("writes lessons into persistent memory");
  });

  it("Beckett keeps the provenance sentence", () => {
    expect(beckett).toContain(
      "Every chunk and every fact carries its source, page, document name, date and exact original wording.",
    );
  });
});
