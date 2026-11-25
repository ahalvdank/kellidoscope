import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ProductFrame from "../src/components/ProductFrame.astro";

const render = async (props: Record<string, unknown>, body = "<p>inner content</p>") => {
  const container = await AstroContainer.create();
  return container.renderToString(ProductFrame, { props, slots: { default: body } });
};

describe("ProductFrame", () => {
  it("renders the label, the slotted content and a single accessible name", async () => {
    const html = await render({ label: "Synthetic example" });
    expect(html).toContain("Synthetic example");
    expect(html).toContain("<p>inner content</p>");
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Synthetic example"');
    expect(html.match(/aria-label=/g)).toHaveLength(1);
  });

  it("renders three decorative window dots hidden from assistive tech", async () => {
    const html = await render({ label: "L" });
    expect(html.match(/data-frame-dot/g)).toHaveLength(3);
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>(?:(?!<\/div>)[\s\S])*data-frame-dot/);
  });

  it("renders the title and badge pills only when given", async () => {
    const plain = await render({ label: "L" });
    expect(plain).not.toContain('data-frame-slot="title"');
    expect(plain).not.toContain('data-frame-slot="badge"');
    const full = await render({ label: "L", title: "Deal memo", badge: "Illustrative" });
    expect(full).toMatch(/data-frame-slot="title"[^>]*>\s*Deal memo\s*</);
    expect(full).toMatch(/data-frame-slot="badge"[^>]*>\s*Illustrative\s*</);
  });

  it("merges the class prop onto the outer element", async () => {
    const html = await render({ label: "L", class: "max-w-3xl extra-class" });
    const outer = html.match(/<div[^>]*role="group"[^>]*>/)?.[0] ?? "";
    expect(outer).toContain("extra-class");
    expect(outer).toContain("max-w-3xl");
    expect(outer).toContain("border-slate-200");
  });
});
