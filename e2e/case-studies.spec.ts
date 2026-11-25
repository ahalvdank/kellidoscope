import { expect, test } from "@playwright/test";

test.describe("10-K case study layout", () => {
  test("Known limits is a closed <details> titled 'Known limits & sample caveats' that holds the 747/2,898 sentence", async ({ page }) => {
    await page.goto("/projects/10k-kb/");
    const details = page.locator("details", { has: page.locator("summary", { hasText: "Known limits & sample caveats" }) });
    await expect(details).toHaveCount(1);
    expect(await details.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    await expect(details).toContainText("747 of the 2,898 chunks");
  });

  test("the role sentence is in My role after The public rewrite, not in the opening", async ({ page }) => {
    await page.goto("/projects/10k-kb/");
    const role = "I was the architect, product manager and engineering team lead";
    const opening = page.locator("article header");
    await expect(opening).toHaveCount(1);
    await expect(opening).not.toContainText(role);
    const text = await page.locator("article").innerText();
    expect(text.split(role)).toHaveLength(2);
    expect(text.indexOf("The public rewrite")).toBeLessThan(text.indexOf(role));
    expect(text.indexOf(role)).toBeLessThan(text.indexOf("Known limits & sample caveats"));
  });
});
