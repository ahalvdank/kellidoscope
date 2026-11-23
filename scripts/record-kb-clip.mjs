#!/usr/bin/env node
// Record a short, silent screen clip of the private KB Explorer for the
// 10-K case study page. Runs against a locally served KB Explorer only.
//
// Privacy guards (the KB also holds private research that must never appear):
//   - Every /api/* response is intercepted. Passage and entity search hits are
//     filtered to the 12 sample companies; every other response is scanned and
//     the run fails if it carries a research entity type or research corpus.
//   - Any passage search against a corpus other than "filings" aborts the run.
//   - Source-file paths are blanked with injected CSS.
//   - After each step the DOM is checked for forbidden badges, local paths and
//     non-sample entities; the ego graph's nodes are read from cytoscape.
//
// API responses are fetched once in an unrecorded warm-up pass and replayed in
// the recorded pass, because cold semantic search takes 15-30 s.
//
// Usage: KB_URL=http://127.0.0.1:4173 node scripts/record-kb-clip.mjs
// Writes media/kb-explorer-raw.webm and media/kb-explorer-trim.json.

import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KB_URL = process.env.KB_URL ?? "http://127.0.0.1:4173";
const MEDIA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "media");
const SIZE = { width: 1280, height: 800 };

const QUERY = "NVIDIA export controls on data center GPUs";
// First NVDA Filing hit wins: prefer the 10-K, fall back to a 10-Q.
const TARGET_FILINGS = [/^NVDA 10-K /, /^NVDA 10-Q /];

const SAMPLE = new Set([
  "NVDA", "AMD", "INTC", "BA", "UNH", "META", "JPM", "XOM", "MSFT", "GOOGL", "AMZN", "CVX",
]);
const FORBIDDEN_TYPES = new Set(["ThesisPage", "ResearchSource", "Technique", "Regime", "Factor"]);
const FORBIDDEN_CORPORA = new Set(["research", "own_research", "deep_research"]);
const FORBIDDEN_DOM_STRINGS = [
  "/Users/", "andrewkell", "portfolio_manager", "own_research", "deep_research", "corpus: research",
];

const violations = [];
function violate(msg) {
  violations.push(msg);
  console.error(`PRIVACY VIOLATION: ${msg}`);
}

/** Ticker segment of a KB source path like "filings/NVDA/2026-02_10-K.md". */
function tickerOf(sourceDocument) {
  const parts = String(sourceDocument ?? "").split("/");
  return parts[0] === "filings" ? parts[1] : null;
}

/** Walk any JSON value and flag forbidden entity types or corpora. */
function scanJson(value, where) {
  if (Array.isArray(value)) {
    value.forEach((v) => scanJson(v, where));
  } else if (value && typeof value === "object") {
    if (FORBIDDEN_TYPES.has(value.type)) violate(`${where}: entity type ${value.type}`);
    if (FORBIDDEN_CORPORA.has(value.corpus)) violate(`${where}: corpus ${value.corpus}`);
    Object.values(value).forEach((v) => scanJson(v, where));
  }
}

/** Keep only passage hits from sample-company filings with an allowed owner. */
function filterChunkHits(hits) {
  return hits.filter(
    (h) =>
      SAMPLE.has(tickerOf(h.source_document)) &&
      h.entity !== null &&
      !FORBIDDEN_TYPES.has(h.entity.type),
  );
}

/** Keep only entity hits carrying a sample ticker and an allowed type. */
function filterEntityHits(hits) {
  return hits.filter((h) => SAMPLE.has(h.ticker) && !FORBIDDEN_TYPES.has(h.type));
}

/**
 * Route every /api/* call: fetch (or replay from cache), enforce the filings
 * corpus, filter search hits to the sample, scan everything else.
 */
async function installApiGuard(page, cache) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/search/chunks" && url.searchParams.get("corpus") !== "filings") {
      violate(`passage search against corpus=${url.searchParams.get("corpus")}`);
      return route.abort();
    }
    if (route.request().method() !== "GET") {
      violate(`non-GET API call ${route.request().method()} ${url.pathname}`);
      return route.abort();
    }
    const key = url.pathname + url.search;
    if (!cache.has(key)) {
      const response = await route.fetch({ timeout: 300_000 });
      cache.set(key, { status: response.status(), body: await response.text() });
    }
    const { status, body } = cache.get(key);
    let data;
    try {
      data = JSON.parse(body);
    } catch (err) {
      console.warn(`non-JSON response for ${key}: ${err.message}`);
      return route.fulfill({ status, body, contentType: "text/plain" });
    }
    if (url.pathname === "/api/search/chunks" && Array.isArray(data)) {
      data = filterChunkHits(data);
    } else if (url.pathname === "/api/search/entities" && Array.isArray(data)) {
      data = filterEntityHits(data);
    } else if (url.pathname === "/api/health" && data?.db) {
      delete data.db.path; // local filesystem path; never needed on screen
    }
    scanJson(data, key);
    return route.fulfill({ status, body: JSON.stringify(data), contentType: "application/json" });
  });
}

const HIDE_PATHS_CSS = `
  a[href^="/source"] { font-size: 0 !important; }
  a[href^="/source"]::after { content: "10-K source"; font-size: 12px; }
`;

/** Fail the run if the current DOM shows anything forbidden. */
async function checkDom(page, step) {
  const html = await page.content();
  for (const s of FORBIDDEN_DOM_STRINGS) {
    if (html.includes(s)) violate(`${step}: DOM contains "${s}"`);
  }
  const found = await page.evaluate(
    ({ forbidden }) => {
      const badges = [...document.querySelectorAll("span")]
        .map((el) => el.textContent.trim())
        .filter((t) => forbidden.includes(t));
      const nodes = window.__kbCy
        ? window.__kbCy.nodes().map((n) => ({ type: n.data("type"), label: n.data("label") ?? n.data("name") }))
        : [];
      return {
        badges,
        badNodes: nodes.filter(
          (n) => forbidden.includes(n.type) || (n.type === "Company" && n.label !== "NVIDIA Corporation"),
        ),
        nodeCount: nodes.length,
      };
    },
    { forbidden: [...FORBIDDEN_TYPES] },
  );
  found.badges.forEach((b) => violate(`${step}: badge "${b}" on page`));
  found.badNodes.forEach((n) => violate(`${step}: graph node ${n.type} "${n.label}"`));
  console.log(`[${step}] DOM ok (graph nodes: ${found.nodeCount})`);
}

/** Search-page check: every passage hit must cite a sample-company filing. */
async function checkSearchHits(page) {
  const paths = await page.$$eval('a[href^="/source"]', (els) => els.map((e) => e.getAttribute("title")));
  if (paths.length === 0) violate("search: no passage hits rendered");
  for (const p of paths) {
    if (!SAMPLE.has(tickerOf(p))) violate(`search: hit from non-sample source ${p}`);
  }
  console.log(`[search] ${paths.length} passage hits, all sample-company filings`);
}

const pause = (page, ms) => page.waitForTimeout(ms);

async function smoothScroll(page, dy, steps = 20, stepMs = 40) {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(stepMs);
  }
}

/** The scripted flow. Returns ms offsets (from page creation) of start and end. */
async function runFlow(page, opened) {
  await page.goto(`${KB_URL}/search`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: HIDE_PATHS_CSS });
  await checkDom(page, "search-empty");
  const start = Date.now() - opened;
  await pause(page, 1200);

  // Pick the filings corpus BEFORE any query exists, so no other corpus is searched.
  await page.getByRole("button", { name: "filings", exact: true }).click();
  await pause(page, 700);
  const input = page.getByPlaceholder("Search the knowledge base…");
  await input.click();
  await input.pressSequentially(QUERY, { delay: 60 });
  await pause(page, 400);
  await input.press("Enter");
  await page.locator("blockquote").first().waitFor({ timeout: 300_000 });
  await checkDom(page, "search-results");
  await checkSearchHits(page);
  await pause(page, 3000);

  // Scroll the first NVDA Filing hit into view, then open it.
  let target = null;
  for (const name of TARGET_FILINGS) {
    const link = page.getByRole("link", { name }).first();
    if ((await link.count()) > 0) {
      target = link;
      break;
    }
  }
  if (target === null) throw new Error("no NVDA Filing among the passage hits");
  const targetName = (await target.textContent()).trim();
  const targetTop = await target.evaluate((el) => el.getBoundingClientRect().top);
  await page.mouse.move(900, 500);
  if (targetTop > 420) await smoothScroll(page, targetTop - 420);
  await pause(page, 1200);
  await target.hover();
  await pause(page, 500);
  await target.click();
  await page.locator("h1", { hasText: targetName }).waitFor({ timeout: 300_000 });
  await page.getByText("Attributes", { exact: true }).waitFor();
  await page.locator('[id^="chunk-"]').first().waitFor({ timeout: 300_000 });
  await page.waitForFunction(() => window.__kbCy && window.__kbCy.nodes().length > 1, null, {
    timeout: 300_000,
  });
  await page.getByText("Computing signals…").waitFor({ state: "detached", timeout: 300_000 });
  await page.waitForLoadState("networkidle");
  await checkDom(page, "entity-top");
  await pause(page, 4500);

  await page.mouse.move(400, 500);
  await smoothScroll(page, 420, 24, 45);
  await checkDom(page, "entity-attributes");
  await pause(page, 3000);

  const chunksTop = await page
    .getByText("Source chunks", { exact: true })
    .evaluate((el) => el.getBoundingClientRect().top);
  await smoothScroll(page, chunksTop - 90, 30, 45);
  await checkDom(page, "entity-chunks");
  await pause(page, 3800);
  return { start, end: Date.now() - opened };
}

async function main() {
  mkdirSync(MEDIA_DIR, { recursive: true });
  const cache = new Map();
  const browser = await chromium.launch({ headless: true });
  try {
    // Pass 1: unrecorded warm-up that fills the response cache.
    const warm = await browser.newContext({ viewport: SIZE });
    const warmPage = await warm.newPage();
    await installApiGuard(warmPage, cache);
    await runFlow(warmPage, Date.now());
    await warm.close();
    console.log(`warm-up done, ${cache.size} API responses cached`);

    // Pass 2: recorded run replaying the cached responses.
    const videoDir = join(MEDIA_DIR, "raw");
    rmSync(videoDir, { recursive: true, force: true });
    const opened = Date.now();
    const context = await browser.newContext({
      viewport: SIZE,
      recordVideo: { dir: videoDir, size: SIZE },
    });
    const page = await context.newPage();
    await installApiGuard(page, cache);
    const timing = await runFlow(page, opened);
    await context.close(); // finalizes the video file
    const [video] = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
    renameSync(join(videoDir, video), join(MEDIA_DIR, "kb-explorer-raw.webm"));
    rmSync(videoDir, { recursive: true, force: true });
    writeFileSync(join(MEDIA_DIR, "kb-explorer-trim.json"), JSON.stringify(timing));
    console.log(`recorded: start ${timing.start} ms, end ${timing.end} ms`);
  } finally {
    await browser.close();
  }
  if (violations.length > 0) {
    console.error(`${violations.length} privacy violation(s); do not use this clip.`);
    process.exit(1);
  }
  console.log("privacy checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
