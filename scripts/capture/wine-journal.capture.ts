import { expect, test, type Page } from "@playwright/test";
import { siteConfig } from "../../src/data/siteConfig";
import { beat, expectNoGate, watchAccountRequests } from "./guards";

// The live wine journal's read-only demo collection, recorded at phone size: 3D cellar, catalog,
// one bottle, atlas. Signed out throughout; the Sign in / Settings controls are never touched.
/** The 3D cellar, rendered and out of its "Opening the cellar…" loading state. */
const readyCellar = (page: Page) => page.locator('[data-testid="cellar-3d"][data-state="ready"]').first();

test("wine journal: demo collection tour", async ({ page, context }) => {
  test.setTimeout(300_000); // warm-up load plus the tour
  const recordingStart = Date.now(); // `page` (the recorded tour) exists from here
  // Warm the asset cache on an unrecorded-for-use page so the recorded tour doesn't open on a
  // long loading overlay. Its video file is discarded; the tour is the `page` recording.
  const warmup = await context.newPage();
  await warmup.goto(siteConfig.cellarApp);
  await warmup.getByRole("button", { name: "Explore demo cellar", exact: true }).click();
  await expect(readyCellar(warmup)).toBeVisible({ timeout: 90_000 });
  await warmup.close();

  // The recording is blank until here; trim it with `ffmpeg -ss <this offset>`.
  console.log(`wine-journal capture: tour starts at ${((Date.now() - recordingStart) / 1000).toFixed(2)} s into video.webm`);
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
  await expect(readyCellar(page)).toBeVisible({ timeout: 60_000 });
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
