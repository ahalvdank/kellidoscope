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
