import { expect, test, type Page } from "@playwright/test";
import { siteConfig } from "../src/data/siteConfig";

// Phone layout (390 x 844): top bar menu, overflow, diagram mobile variants, inspector tab bar.
// Runs on WebKit (iOS Safari engine) and Chromium.

const PHONE = { width: 390, height: 844 };
const TRACE = "/demos/10k-kb/q/ba-liquidity-and-debt-fy24-fy25/";
const OVERFLOW_PAGES = [
  "/",
  "/projects/10k-kb/",
  "/projects/beckett-diligence/",
  "/projects/portfolio-manager/",
  "/demos/10k-kb/",
  TRACE,
];

test.use({ viewport: PHONE });

test.describe("top bar menu without JavaScript (C2.7)", () => {
  test.use({ javaScriptEnabled: false });

  test("links are reachable through the <details> menu", async ({ page }) => {
    await page.goto("/");
    const bar = page.locator("header.site-topbar");
    const menu = bar.locator("details");
    await expect(menu).toHaveCount(1);
    // Closed: the page links are not exposed.
    await expect(bar.getByRole("link", { name: "Query Traces" })).toBeHidden();
    await menu.locator("summary").click();
    await expect(menu).toHaveAttribute("open", "");
    for (const [name, href] of [
      ["10-K KB", "/projects/10k-kb"],
      ["Beckett", "/projects/beckett-diligence"],
      ["Portfolio Manager", "/projects/portfolio-manager"],
      ["Wine apps", "/#wine-apps"],
      ["Query Traces", "/demos/10k-kb"],
      ["LinkedIn", siteConfig.linkedin],
      ["GitHub", siteConfig.github],
    ] as const) {
      const link = bar.getByRole("link", { name, exact: true });
      await expect(link, name).toBeVisible();
      await expect(link, name).toHaveAttribute("href", href);
    }
    await expect(bar.getByRole("link", { name: "Résumé" })).toBeVisible();
    await expect(bar.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("the menu does not exist at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.locator("header.site-topbar details")).toBeHidden();
    await expect(page.locator("header.site-topbar").getByRole("link", { name: "Query Traces" })).toBeVisible();
  });
});

for (const size of [
  { width: 1280, height: 900 },
  { width: 640, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Wine apps scrolls to a clear wine heading on Home at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/projects/10k-kb/");
    const bar = page.locator("header.site-topbar");
    if (size.width < 640) await bar.locator("summary").click();
    await bar.getByRole("link", { name: "Wine apps", exact: true }).click();
    await expect(page).toHaveURL(/\/#wine-apps$/);
    await expect(page.locator("#wine-apps")).toBeInViewport();
    const heading = page.locator("#wine-apps h2").first();
    await expect.poll(() => heading.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(
      await bar.evaluate((el) => el.getBoundingClientRect().bottom),
    );
  });
}

test("phone: tapping Wine apps on Home with the menu open leaves the heading uncovered", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("header.site-topbar");
  await bar.locator("summary").click();
  await bar.getByRole("link", { name: "Wine apps", exact: true }).click();
  await expect(page).toHaveURL(/\/#wine-apps$/);
  const heading = page.locator("#wine-apps h2").first();
  await expect(heading).toBeVisible();
  await expect
    .poll(() =>
      heading.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + 8, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      }),
    )
    .toBe(true);
});

for (const path of OVERFLOW_PAGES) {
  test(`no horizontal overflow at 390px on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scrollWidth, offenders } = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const wide = [...document.body.querySelectorAll("*")]
        .filter((el) => el.getBoundingClientRect().right > width + 0.5 && !el.closest("svg, [data-scroll-x]"))
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
      return { scrollWidth: document.documentElement.scrollWidth, offenders: wide };
    });
    expect(scrollWidth, `offenders: ${offenders.join(" | ")}`).toBeLessThanOrEqual(PHONE.width);
  });
}

const MAX_MOBILE_LABEL = 36;

for (const [path, arrows, name] of [
  ["/projects/10k-kb/", 3, "10-K"],
  ["/projects/beckett-diligence/", 4, "Beckett"],
] as const) {
  test(`${name} diagram has a stacked variant with connector arrows below 640px (C2.9)`, async ({ page }) => {
    await page.goto(path);
    const mobile = page.locator('svg[data-variant="mobile"]');
    const desktop = page.locator('svg[data-variant="desktop"]');
    await expect(mobile).toBeVisible();
    await expect(desktop).toBeHidden();
    // One vertical connector with an arrowhead between each pair of stacked boxes.
    const connectors = await mobile.locator("line[marker-end]").evaluateAll((lines) =>
      lines.map((l) => [l.getAttribute("x1"), l.getAttribute("x2")]),
    );
    expect(connectors).toHaveLength(arrows);
    for (const [x1, x2] of connectors) expect(x1).toBe(x2);
    // Every marker an arrow references must exist inside this svg (a marker in the hidden desktop svg does not render).
    const dangling = await mobile.evaluate((svg) =>
      [...svg.querySelectorAll("line[marker-end]")]
        .map((l) => /url\(#([^)]+)\)/.exec(l.getAttribute("marker-end") ?? "")?.[1])
        .filter((id) => !id || !svg.querySelector(`marker[id="${id}"]`)),
    );
    expect(dangling).toEqual([]);
    // Text: monospace at 10px, every label at most 36 characters.
    const texts = await mobile.locator("text").evaluateAll((els) =>
      els.map((el) => ({
        text: (el.textContent ?? "").trim(),
        mono: /mono/i.test(el.getAttribute("font-family") ?? ""),
        size: Number(el.getAttribute("font-size")),
      })),
    );
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t.text.length, `"${t.text}"`).toBeLessThanOrEqual(MAX_MOBILE_LABEL);
      if (t.mono) expect(t.size, `"${t.text}"`).toBe(10);
    }
  });
}

test("inspector tab bar scrolls horizontally, not wraps (C2.8)", async ({ page }) => {
  await page.goto(TRACE);
  const bar = page.getByRole("tablist", { name: "Evidence inspector" });
  await expect(bar).toBeVisible();
  const style = await bar.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { overflowX: cs.overflowX, tops: [...el.children].map((c) => Math.round(c.getBoundingClientRect().top)) };
  });
  expect(["auto", "scroll"]).toContain(style.overflowX);
  expect(new Set(style.tops).size, "all tabs on one row").toBe(1);
  const whiteSpaces = await bar.getByRole("tab").evaluateAll((tabs) => tabs.map((t) => getComputedStyle(t).whiteSpace));
  expect(new Set(whiteSpaces)).toEqual(new Set(["nowrap"]));
  const widths = await bar.getByRole("tab").evaluateAll((tabs) => tabs.map((t) => t.getBoundingClientRect().width));
  expect(Math.min(...widths), "tabs keep their natural width").toBeGreaterThan(50);
});

test("sticky header has an opaque background", async ({ page }) => {
  await page.goto("/");
  const bg = await page.locator("header.site-topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  expect(bg).not.toBe("transparent");
  expect(bg).toMatch(/^rgb\(/);
});

test("mobile citation dialog opens, scrolls when long, and closes on backdrop click (C2.8)", async ({ page }) => {
  await page.goto(TRACE);
  await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", /.*/, { timeout: 10_000 });
  await page.locator(".prose button").filter({ hasText: /^\[\d+\]$/ }).first().click();
  const dialog = page.locator("dialog");
  await expect(dialog).toBeVisible();
  const m = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { height: r.height, scrollable: el.scrollHeight > el.clientHeight, overflowY: getComputedStyle(el).overflowY, vh: innerHeight };
  });
  expect(m.overflowY).toBe("auto");
  expect(m.height).toBeLessThanOrEqual(m.vh * 0.85 + 1);
  expect(m.scrollable, "long passage scrolls inside the dialog").toBe(true);
  await dialog.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  expect(await dialog.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  // Backdrop: a point outside the dialog box.
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
});
