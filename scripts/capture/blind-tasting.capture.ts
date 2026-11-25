import { expect, test } from "@playwright/test";
import { siteConfig } from "../../src/data/siteConfig";
import { beat, expectNoGate, watchAccountRequests } from "./guards";

// One practice round of the live blind-tasting game, recorded at phone size.
// Phone motion is simulated: before the app loads, this script grants the motion permission and streams
// DeviceMotionEvents shaped like the app's own synthetic swirl / nose / sip traces
// (blind-tasting-public src/sensors/synthetic.ts). Captions must say the motion was simulated.

/** Runs in the page before any app script. Kept self-contained: Playwright serialises it. */
function installMotionDriver(): void {
  const G = 9.81;
  type V = { x: number; y: number; z: number };
  const upFor = (roll: number, pitch = 0): V => ({
    x: -Math.sin(roll) * Math.cos(pitch) * G,
    y: Math.cos(roll) * Math.cos(pitch) * G,
    z: -Math.sin(pitch) * G,
  });
  const ZERO: V = { x: 0, y: 0, z: 0 };
  const still = () => ({ up: upFor(0), accel: ZERO });
  const granted = () => Promise.resolve("granted");
  const w = window as unknown as Record<string, unknown> & {
    DeviceMotionEvent?: { requestPermission?: unknown };
    DeviceOrientationEvent?: { requestPermission?: unknown };
  };
  if (w.DeviceMotionEvent) w.DeviceMotionEvent.requestPermission = granted;
  if (w.DeviceOrientationEvent) w.DeviceOrientationEvent.requestPermission = granted;
  const SIP_ANGLE = (70 * Math.PI) / 180;
  const gestures: Record<string, { ms: number; at: (s: number) => { up: V; accel: V } }> = {
    // 2 rev/s for 3.5 turns in the horizontal plane, then 1 s still (the bout fires after rotation stops).
    swirl: {
      ms: 2750,
      at: (s) =>
        s < 1.75 ? { up: upFor(0), accel: { x: 2.5 * Math.cos(4 * Math.PI * s), y: 0, z: 2.5 * Math.sin(4 * Math.PI * s) } } : still(),
    },
    // Push toward the face, coast, brake, hold.
    nose: { ms: 1350, at: (s) => ({ up: upFor(0), accel: { x: 0, y: 0, z: s < 0.2 ? 3 : s < 0.35 ? 0 : s < 0.55 ? -3 : 0 } }) },
    // Tip back 70 degrees, hold, return.
    sip: {
      ms: 2300,
      at: (s) => {
        const p = s < 0.5 ? (SIP_ANGLE * s) / 0.5 : s < 1.5 ? SIP_ANGLE : s < 2 ? SIP_ANGLE * (1 - (s - 1.5) / 0.5) : 0;
        return { up: upFor(0, p), accel: ZERO };
      },
    },
  };
  let active: { ms: number; at: (s: number) => { up: V; accel: V }; start: number } | null = null;
  w.__motion = {
    play: (name: string) => {
      active = { ...gestures[name]!, start: performance.now() };
    },
    busy: () => active !== null,
  };
  setInterval(() => {
    const now = performance.now();
    if (active && now - active.start > active.ms) active = null;
    const { up, accel } = active ? active.at((now - active.start) / 1000) : still();
    window.dispatchEvent(
      new DeviceMotionEvent("devicemotion", {
        acceleration: accel,
        accelerationIncludingGravity: { x: up.x + accel.x, y: up.y + accel.y, z: up.z + accel.z },
        rotationRate: { alpha: 0, beta: 0, gamma: 0 },
        interval: 16,
      }),
    );
  }, 16);
}

test("blind-tasting: one practice round", async ({ page }) => {
  const accountRequests = watchAccountRequests(page);
  await page.addInitScript(installMotionDriver);
  // A fixed wine and seed so the sheet answers below are sensible for the wine served.
  await page.goto(`${siteConfig.blindTastingApp}/?wine=sancerre&seed=42&mode=practice`);
  await expectNoGate(page);
  await expect(page.getByRole("button", { name: "Start tasting" })).toBeVisible();
  await beat(page, 1200);

  await page.getByRole("button", { name: "Start tasting" }).click();
  await expect(page.getByRole("heading", { name: "Hold it like a glass" })).toBeVisible();
  const counts = page.locator(".gesture-counts");
  await expect(counts).toBeVisible({ timeout: 10_000 });
  await beat(page, 800);

  const perform = async (name: "swirl" | "nose" | "sip", expected: RegExp) => {
    await page.evaluate((g) => (window as unknown as { __motion: { play(n: string): void } }).__motion.play(g), name);
    await page.waitForFunction(() => !(window as unknown as { __motion: { busy(): boolean } }).__motion.busy());
    await expect(counts).toHaveText(expected, { timeout: 3000 });
    await beat(page, 300);
  };
  await perform("swirl", /Swirls: 1 /);
  await perform("swirl", /Swirls: 2 /);
  await perform("nose", /Noses: 1 /);
  await perform("nose", /Noses: 2 /);
  await perform("sip", /Sips: 1$/);

  await page.getByRole("button", { name: "Show sheet" }).click();
  await beat(page, 700);
  const radio = async (group: string, name: string) => {
    await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name, exact: true }).click();
    await beat(page, 250);
  };
  await page.getByRole("searchbox", { name: "Search wines" }).fill("Sauvignon");
  await beat(page);
  const wine = page.getByRole("combobox", { name: "Grape / Wine" });
  const wineValue = await wine.locator("option").evaluateAll((options) =>
    (options as HTMLOptionElement[]).find((o) => /sauvignon blanc/i.test(o.text) && o.value)?.value,
  );
  expect(wineValue, "a Sauvignon Blanc option").toBeTruthy();
  await wine.selectOption(wineValue!);
  await beat(page, 250);
  await page.getByRole("combobox", { name: "Country" }).selectOption({ label: "France" });
  await beat(page, 250);
  const region = page.getByRole("combobox", { name: "Region" });
  const regionValue = await region.locator("option").evaluateAll((options) =>
    (options as HTMLOptionElement[]).find((o) => /loire|sancerre/i.test(o.text) && o.value)?.value,
  );
  expect(regionValue, "a Loire option").toBeTruthy();
  await region.selectOption(regionValue!);
  await beat(page, 250);
  await radio("Color intensity", "Pale");
  await radio("Hue", "Greenish–Straw");
  await radio("Healthy", "Yes");
  await radio("Aroma intensity", "Fairly aromatic");
  for (const aroma of ["Grapefruit", "Lime", "Gooseberry", "Grass", "Flint"]) {
    await page.getByRole("button", { name: aroma, exact: true }).click();
    await beat(page, 200);
  }
  await radio("Carbonation", "Flat");
  await radio("Dryness", "Dry");
  await radio("Acidity", "High");
  await radio("Tannin", "NA");
  await radio("Body", "Light");
  await radio("Alcohol level", "Warmth");
  await radio("Quality", "Good");
  await radio("Readiness", "Drink now");

  await page.getByRole("button", { name: "Submit sheet" }).click();
  await beat(page, 600);
  await page.getByRole("button", { name: "Confirm submit" }).click();
  await expect(page.getByText(/\d+ \/ \d+/).first()).toBeVisible();
  await beat(page, 2500);
  await page.mouse.wheel(0, 700);
  await beat(page, 2000);
  await page.mouse.wheel(0, 700);
  await beat(page, 2000);
  expect(accountRequests).toEqual([]);
});
