import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { siteConfig } from "../src/data/siteConfig";

// Proves the production CSP (vercel.json, served verbatim by e2e/serve-dist.mjs) lets Astro's
// inline island bootstrap and the SRI-pinned GoatCounter script run, with zero violations.

const VERCEL = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const PROD_CSP: string = VERCEL.headers[0].headers.find(
  (h: { key: string }) => h.key === "Content-Security-Policy",
).value;
const COUNT_JS_URL = "https://gc.zgo.at/count.v5.js";
// The real v5 file (ISC licence); its sha384 must match the integrity attribute or the browser
// refuses it, so this also proves the SRI value offline.
const COUNT_JS = readFileSync(new URL("./fixtures/count.v5.js", import.meta.url));
const TRACE = "/demos/10k-kb/q/ba-liquidity-and-debt-fy24-fy25/";
const OTHER_TRACE_SLUG = "amd-fy2025-10ka-amendment";

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

let consoleProblems: string[];

test.beforeEach(async ({ page }) => {
  consoleProblems = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || /content security policy|refused to/i.test(text)) {
      consoleProblems.push(`${msg.type()}: ${text}`);
    }
  });
  page.on("pageerror", (err) => consoleProblems.push(`pageerror: ${err.message}`));
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`);
    });
  });
  await page.route(COUNT_JS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: COUNT_JS,
    }),
  );
});

test.afterEach(async ({ page }) => {
  const violations = await page.evaluate(() => window.__cspViolations);
  expect(violations, "securitypolicyviolation events").toEqual([]);
  expect(consoleProblems, "console errors / CSP messages").toEqual([]);
});

async function gotoWithProdHeaders(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toBe(PROD_CSP);
  expect(/script-src[^;]*'unsafe-inline'/.test(PROD_CSP)).toBe(false);
}

async function waitForHydration(page: Page) {
  // Astro removes the `ssr` attribute once the island has hydrated.
  await expect(page.locator("astro-island")).toHaveCount(1);
  await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", /.*/, { timeout: 10_000 });
}

test("trace page hydrates under the production CSP: a citation pill highlights its passage", async ({ page }) => {
  await gotoWithProdHeaders(page, TRACE);
  await waitForHydration(page);

  const pill = page.locator(".prose button").filter({ hasText: /^\[\d+\]$/ }).first();
  const cite = (await pill.textContent())!.replace(/[[\]]/g, "");
  const passage = page.locator(`#passage-cite-${cite}`);
  await expect(passage).not.toHaveAttribute("data-highlighted", "true");
  await pill.click();
  await expect(passage).toHaveAttribute("data-highlighted", "true");
});

test("switching traces fetches JSON and updates the URL under the production CSP", async ({ page }) => {
  await gotoWithProdHeaders(page, TRACE);
  await waitForHydration(page);
  const manifest = JSON.parse(readFileSync(new URL("../src/data/traces/manifest.json", import.meta.url), "utf8"));
  const other = manifest.traces.find((t: { slug: string }) => t.slug === OTHER_TRACE_SLUG);
  await page.getByRole("button", { name: new RegExp(other.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
  await expect(page).toHaveURL(new RegExp(`/demos/10k-kb/q/${OTHER_TRACE_SLUG}/$`));
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(other.question);
});

test("GoatCounter v5 loads with SRI and binds click events on static links", async ({ page }) => {
  await gotoWithProdHeaders(page, TRACE);
  await page.waitForFunction(() => typeof window.goatcounter?.count === "function");
  await expect(page.locator('a[data-goatcounter-click="resume"]')).toHaveAttribute(
    "data-goatcounter-bound",
    "true",
  );
});

test("top bar uses siteConfig links, counts resume/repo clicks, and has no email link", async ({ page }) => {
  await gotoWithProdHeaders(page, "/demos/10k-kb/");
  const bar = page.locator("header.site-topbar");
  await expect(bar.getByRole("link", { name: "Résumé" })).toHaveAttribute("href", siteConfig.resumePath);
  await expect(bar.getByRole("link", { name: "Résumé" })).toHaveAttribute("data-goatcounter-click", "resume");
  await expect(bar.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", siteConfig.linkedin);
  await expect(bar.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", siteConfig.github);
  await expect(bar.getByRole("link", { name: "GitHub" })).toHaveAttribute("data-goatcounter-click", "repo");
  await expect(bar.locator('a[href^="mailto:"], #obfuscated-email')).toHaveCount(0);
  await expect(bar.getByText("Email")).toHaveCount(0);
});

const CONTENT_PAGES: [string, string][] = [
  ["/", "Auditable AI decision systems for finance and operations."],
  ["/projects/10k-kb/", "10-K / 10-Q research knowledge base"],
  ["/projects/beckett-diligence/", "Beckett deal-diligence platform"],
  ["/projects/portfolio-manager/", "Portfolio manager"],
  ["/404.html", "Page not found"],
];

for (const [path, heading] of CONTENT_PAGES) {
  test(`${path} renders under the production CSP with no console errors`, async ({ page }) => {
    await gotoWithProdHeaders(page, path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await page.waitForFunction(() => typeof window.goatcounter?.count === "function");
  });
}

test("10-K case study: teaser pills open featured trace pages and the repo link is counted", async ({ page }) => {
  await gotoWithProdHeaders(page, "/projects/10k-kb/");
  const pills = page.getByRole("navigation", { name: "Featured query traces" }).locator("li a");
  await expect(pills).toHaveCount(4);
  // No clip URL in siteConfig yet, so the clip slot renders nothing.
  await expect(page.locator('[data-slot="system-clip"]')).toHaveCount(0);
  const repo = page.getByRole("link", { name: /public pipeline repository/ });
  await expect(repo).toHaveAttribute("href", siteConfig.filingsKbRepo);
  await expect(repo).toHaveAttribute("data-goatcounter-click", "repo");
  await pills.first().click();
  await expect(page).toHaveURL(/\/demos\/10k-kb\/q\/[a-z0-9-]+\/$/);
  await waitForHydration(page);
});
