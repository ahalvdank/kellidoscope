import { expect, test } from "@playwright/test";

const PAGE = "/projects/beckett-diligence/";
const FRAME = "Synthetic CPG example · illustrative workflow (no real deal data)";
const TABS = [
  { label: "Structured fact basis", panel: "fact-basis" },
  { label: "Committee review", panel: "committee" },
  { label: "Reasoning journal → retrospective lesson", panel: "journal" },
];

test.describe("Beckett workflow preview tabs without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("each tab label shows its panel and hides the others", async ({ page }) => {
    await page.goto(PAGE);
    const frame = page.getByRole("group", { name: FRAME });
    for (const tab of TABS) {
      await frame.locator("label", { hasText: tab.label }).click();
      for (const other of TABS) {
        const panel = frame.locator(`[data-beckett-panel="${other.panel}"]`);
        if (other.panel === tab.panel) await expect(panel).toBeVisible();
        else await expect(panel).toBeHidden();
      }
    }
  });

  test("radios are keyboard-focusable and arrow keys switch tabs", async ({ page }) => {
    await page.goto(PAGE);
    const frame = page.getByRole("group", { name: FRAME });
    await frame.getByRole("radio").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(frame.locator('[data-beckett-panel="committee"]')).toBeVisible();
  });
});

test.describe("Beckett workflow preview at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the page does not overflow horizontally on any tab", async ({ page }) => {
    await page.goto(PAGE);
    const frame = page.getByRole("group", { name: FRAME });
    for (const tab of TABS) {
      await frame.locator("label", { hasText: tab.label }).click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("the fact table scrolls inside its frame wrapper", async ({ page }) => {
    await page.goto(PAGE);
    const wrapper = page.getByRole("group", { name: FRAME }).locator('[data-beckett-panel="fact-basis"] .overflow-x-auto');
    const { scroll, client } = await wrapper.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(scroll).toBeGreaterThan(client);
  });
});
