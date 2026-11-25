import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TelegramApprovalPreview from "../src/components/TelegramApprovalPreview.astro";
import PortfolioClip from "../src/components/PortfolioClip.astro";
import { readFileSync } from "node:fs";
import { siteConfig } from "../src/data/siteConfig";

const LABEL =
  "Illustrative composite · synthetic ticker (not a real position). The real Telegram alert is shorter; this card gathers what feeds one decision.";

const render = async () => (await AstroContainer.create()).renderToString(TelegramApprovalPreview);
const text = (html: string) =>
  html
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");

describe("TelegramApprovalPreview", () => {
  it("uses the PM frame label verbatim", async () => {
    const html = await render();
    expect(html).toContain(`aria-label="${LABEL}"`);
    expect(text(html)).toContain(LABEL);
  });

  it("keeps the real card's structure: header, quantity line, account line", async () => {
    const t = text(await render());
    expect(t).toContain("🟢 BUY EXAMPLE");
    expect(t).toContain("Qty: 10 | Type: limit");
    expect(t).toContain("Account: EXAMPLE");
  });

  it("buttons read ✅ Execute, ⏰ Wait, ❌ Cancel and the card never says Approve or Reject", async () => {
    const html = await render();
    const t = text(html);
    for (const label of ["✅ Execute", "⏰ Wait", "❌ Cancel"]) expect(t).toContain(label);
    expect(t).not.toMatch(/\bApprove\b|\bReject\b/);
    expect(html).not.toMatch(/<button\b/);
  });

  it('names the committee in the site\'s wording and never says "6-agent"', async () => {
    const t = text(await render());
    expect(t.toLowerCase()).toContain(
      "fundamentals, valuation, macro, catalyst, devil's advocate and knowledge-base specialist agents, plus an aggregator",
    );
    expect(t).not.toMatch(/6[- ]agent/i);
    expect(t).toContain("Valuation already prices in two more quarters of growth.");
  });

  it("the 10-K line is tagged [shadow] and says it is not used for this trade", async () => {
    const t = text(await render());
    expect(t).toMatch(/10-K signals \[shadow\]: not used for this trade/);
  });

  it("has a tax-lot line naming holding period and short- vs long-term", async () => {
    const t = text(await render());
    expect(t).toMatch(/tax-lot check \(example\)/i);
    expect(t).toMatch(/holding period would start at the fill/i);
    expect(t).toMatch(/short- vs long-term/i);
  });

  it("has no sentiment or FinBERT wording and no dollar amounts", async () => {
    const t = text(await render());
    expect(t).not.toMatch(/sentiment|finbert/i);
    expect(t).not.toMatch(/\$\s?\d/);
  });

  it("the strip reads ML ensemble → regime model → agent committee → my approval on Telegram", async () => {
    const t = text(await render());
    expect(t).toContain("ML ensemble → regime model → agent committee → my approval on Telegram");
    const html = await render();
    expect(html.indexOf("my approval on Telegram")).toBeGreaterThan(html.indexOf("❌ Cancel"));
  });
});

describe("portfolio manager clip slot", () => {
  it("ships with no clip configured", () => {
    expect(siteConfig.portfolioClipUrl).toBeNull();
    expect(siteConfig.portfolioClipPoster).toBeNull();
  });

  it("the PM page hides the clip slot while portfolioClipUrl is null", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PortfolioClip, { props: { src: siteConfig.portfolioClipUrl } });
    expect(html.trim()).toBe("");
    const page = readFileSync("src/pages/projects/portfolio-manager.astro", "utf8");
    expect(page).toContain("<PortfolioClip src={siteConfig.portfolioClipUrl}");
  });

  it("renders a framed video once a clip URL exists", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PortfolioClip, { props: { src: "/media/x.mp4" } });
    expect(html).toContain('data-slot="portfolio-clip"');
    expect(html).toContain('role="group"');
    expect(html).not.toMatch(/autoplay|\bloop\b/);
  });
});
