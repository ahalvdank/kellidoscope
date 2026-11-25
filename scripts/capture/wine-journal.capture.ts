import { expect, test } from "@playwright/test";
import { siteConfig } from "../../src/data/siteConfig";
import { beat, expectNoGate, watchAccountRequests } from "./guards";

// The live wine journal's read-only demo collection, recorded at phone size: 3D cellar, catalog,
// one bottle, atlas. Signed out throughout; the Sign in / Settings controls are never touched.
test("wine journal: demo collection tour", async ({ page }) => {
  const accountRequests = watchAccountRequests(page);
  await page.goto(siteConfig.cellarApp);
  await expectNoGate(page);
  const enter = page.getByRole("button", { name: "Explore demo cellar", exact: true });
  await expect(enter).toBeVisible();
  await beat(page, 1000);
  await enter.click();

  const demo = page.getByRole("region", { name: "Demo cellar", exact: true });
  const views = demo.getByRole("group", { name: "Demo collection view" });
  await expect(views).toBeVisible({ timeout: 15_000 });
  await beat(page, 1500);

  // 3D cellar (the default demo view).
  await views.getByRole("button", { name: "Demo cellar", exact: true }).click();
  await page.mouse.wheel(0, 900);
  await beat(page, 3500);
  await page.mouse.wheel(0, 700);
  await beat(page, 3000);

  // Catalog list, then one bottle.
  await page.mouse.wheel(0, -5000);
  await beat(page, 500);
  await views.getByRole("button", { name: "Demo catalog", exact: true }).click();
  await beat(page, 1200);
  await page.mouse.wheel(0, 700);
  await beat(page, 1500);
  const bottle = demo.getByRole("button", { name: /^Open / }).first();
  await bottle.scrollIntoViewIfNeeded();
  await beat(page, 600);
  await bottle.click();
  await beat(page, 2500);
  await page.mouse.wheel(0, 600);
  await beat(page, 2500);

  // Atlas.
  const back = demo.getByRole("button", { name: "Back to demo collection" });
  if ((await back.count()) > 0 && (await back.first().isVisible())) {
    await back.first().click();
  } else {
    console.warn('wine-journal capture: no visible "Back to demo collection" button; scrolling up to the views instead.');
  }
  await page.mouse.wheel(0, -5000);
  await beat(page, 500);
  await views.getByRole("button", { name: "Demo atlas", exact: true }).click();
  await beat(page, 1500);
  await page.mouse.wheel(0, 700);
  await beat(page, 4000);
  await expectNoGate(page);
  expect(accountRequests).toEqual([]);
});
