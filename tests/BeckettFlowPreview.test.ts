import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import BeckettFlowPreview from "../src/components/BeckettFlowPreview.astro";
import { copyViolations } from "../scripts/copy-rules.mjs";

const LABEL = "Synthetic CPG example · illustrative workflow (no real deal data)";

const render = async () => (await AstroContainer.create()).renderToString(BeckettFlowPreview);
const text = (html: string) =>
  html
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");

describe("BeckettFlowPreview", () => {
  it("uses the Beckett frame label verbatim", async () => {
    const html = await render();
    expect(html).toContain(`aria-label="${LABEL}"`);
    expect(text(html)).toContain(LABEL);
  });

  it("has exactly three tabs: Structured fact basis, Committee review, Reasoning journal → retrospective lesson", async () => {
    const html = await render();
    expect(html.match(/<input[^>]*type="radio"/g)).toHaveLength(3);
    const labels = [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map((m) => text(m[1]).trim());
    expect(labels).toEqual(["Structured fact basis", "Committee review", "Reasoning journal → retrospective lesson"]);
  });

  it("keeps radios keyboard-focusable (sr-only, never display:none) and styles label focus", async () => {
    const html = await render();
    for (const input of html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []) {
      expect(input).toContain("sr-only");
      expect(input).not.toMatch(/hidden/);
    }
    expect(html).toMatch(/peer-focus-visible\/\w+:(ring|outline)/);
  });

  it("contains no <script> and no $ followed by a digit", async () => {
    const html = await render();
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\$\s?\d/);
  });

  it("fact table has the seven columns and 3 rows using each provenance label", async () => {
    const html = await render();
    const heads = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => text(m[1]).trim());
    expect(heads).toEqual(["Fact", "Value", "Source document", "Page", "Date", "Exact quote", "Provenance"]);
    const bodyRows = html.match(/<tbody[\s\S]*?<\/tbody>/)?.[0].match(/<tr[\s>]/g) ?? [];
    expect(bodyRows).toHaveLength(3);
    for (const label of ["DOC-SOURCED", "WEB-VERIFIED", "UNVERIFIED"]) {
      expect(html.match(new RegExp(`>\\s*${label}\\s*<`, "g")) ?? []).toHaveLength(1);
    }
    expect(html).toContain("overflow-x-auto");
  });

  it("committee shows adversarial reviewer, associate and partner, each with a severity and a verdict, plus a combined verdict", async () => {
    const t = text(await render());
    for (const role of ["adversarial reviewer", "associate", "partner"]) expect(t.toLowerCase()).toContain(role);
    const rows = [...(await render()).matchAll(/data-committee-role="([^"]+)"([\s\S]*?)<\/(?:li|tr)>/g)];
    expect(rows.map((r) => r[1])).toEqual(["adversarial reviewer", "associate", "partner"]);
    for (const [, , body] of rows) {
      expect(text(body)).toMatch(/CRITICAL|WARNING|INFO/);
      expect(text(body)).toMatch(/\b(APPROVE|CONDITIONAL APPROVE|REJECT)\b/);
    }
    expect(t).toMatch(/Combined verdict\W+CONDITIONAL APPROVE/);
  });

  it("the combined verdict is CONDITIONAL APPROVE given one CRITICAL and no REJECT in the committee rows", async () => {
    const html = await render();
    const rows = [...html.matchAll(/data-committee-role="[^"]+"([\s\S]*?)<\/(?:li|tr)>/g)].map((m) => text(m[1]));
    const verdicts = rows.map((r) => r.match(/\b(CONDITIONAL APPROVE|APPROVE|REJECT)\b/)![1]);
    const criticals = rows.map((r) => (r.match(/CRITICAL/g) ?? []).length).reduce((a, b) => a + b, 0);
    expect(verdicts).not.toContain("REJECT");
    expect(criticals).toBe(1);
    expect(text(html)).toMatch(/Combined verdict\W+CONDITIONAL APPROVE/);
  });

  it("journal entry uses the real keys", async () => {
    const t = text(await render());
    for (const key of ["stage", "hypotheses_considered", "dead_ends", "resolution", "principle", "generalization", "confidence"]) {
      expect(t).toContain(key);
    }
  });

  it("the caption says the journal is written by the model with my responses and the retrospective is run by hand so far", async () => {
    expect(text(await render())).toContain(
      "The model writes this journal, with my responses; I have run the retrospective by hand so far.",
    );
  });

  it("passes the site copy rules, avoids 'sentiment' and names a plainly fictional company", async () => {
    const t = text(await render());
    expect(copyViolations(t, { rendered: true })).toEqual([]);
    expect(t).not.toMatch(/sentiment/i);
    expect(t).toContain("Oatfield Snacks Co.");
  });
});
