import { expect, test } from "@playwright/test";

// An ad blocker or privacy extension drops GoatCounter. The island must still hydrate and
// citations must still work, with no uncaught exception.

const TRACE = "/demos/10k-kb/q/ba-liquidity-and-debt-fy24-fy25/";

test("with count.v5.js blocked, the island hydrates and a citation click works without pageerror", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.route("https://gc.zgo.at/**", (route) => route.abort());

  await page.goto(TRACE);
  await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", /.*/, { timeout: 10_000 });
  expect(await page.evaluate(() => typeof window.goatcounter)).toBe("undefined");

  const pill = page.locator(".prose button").filter({ hasText: /^\[\d+\]$/ }).first();
  const cite = (await pill.textContent())!.replace(/[[\]]/g, "");
  const passage = page.locator(`#passage-cite-${cite}`);
  await pill.click();
  await expect(passage).toHaveAttribute("data-highlighted", "true");

  // A counted click on an island link must not throw either.
  await page.locator(`#passage-cite-${cite} a`).first().evaluate((a) => a.addEventListener("click", (e) => e.preventDefault()));
  await page.locator(`#passage-cite-${cite} a`).first().click();
  expect(pageErrors).toEqual([]);
});
