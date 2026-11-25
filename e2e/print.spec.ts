import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Prints pages to PDF and checks the PDF text layer, so clipped (scroll-boxed) content fails.
// page.pdf() is Chromium-only; text is extracted with poppler's pdftotext.

test.skip(({ browserName }) => browserName !== "chromium", "page.pdf() is Chromium-only");

const TRACE = "/demos/10k-kb/q/ba-liquidity-and-debt-fy24-fy25/";

const normalise = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
/** Whitespace-free form: pdftotext spaces table-like text differently from the DOM, but never drops characters. */
const compact = (s: string) => s.normalize("NFKC").replace(/\s+/g, "");
const EDGE = 40;

async function printedText(page: Page): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "kellidoscope-print-"));
  try {
    const pdf = join(dir, "page.pdf");
    writeFileSync(pdf, await page.pdf({ format: "Letter", printBackground: true }));
    return normalise(execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The first and last 40 non-space characters of a block must both appear in the printed text. */
function expectEndsPrinted(printed: string, block: string, label: string) {
  const chars = compact(block);
  expect(chars.length, label).toBeGreaterThan(EDGE * 2);
  const text = compact(printed);
  expect(text, `${label}: start`).toContain(chars.slice(0, EDGE));
  expect(text, `${label}: end`).toContain(chars.slice(-EDGE));
}

test("trace page prints every inspector passage and the whole answer", async ({ page }) => {
  await page.goto(TRACE);
  await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", /.*/, { timeout: 10_000 });
  await page.emulateMedia({ media: "print" });
  const passages = await page.locator("#inspector-panel article p.leading-relaxed").allInnerTexts();
  const answer = await page.locator("section.prose, .prose").first().innerText();
  expect(passages.length, "inspector has passages").toBeGreaterThan(3);

  const printed = await printedText(page);
  passages.forEach((p, i) => expectEndsPrinted(printed, p, `passage ${i + 1}`));
  expectEndsPrinted(printed, answer, "answer");
});

test("10-K case study prints its last paragraph and hides the top bar", async ({ page }) => {
  await page.goto("/projects/10k-kb/");
  await page.emulateMedia({ media: "print" });
  const paragraphs = await page.locator("main p").allInnerTexts();
  const last = paragraphs.filter((p) => compact(p).length > EDGE * 2).at(-1)!;
  const printed = await printedText(page);
  expectEndsPrinted(printed, last, "last paragraph");
  expect(normalise(printed)).not.toContain("Query Traces");
});

test("10-K case study prints the closed Known limits disclosure", async ({ page }) => {
  await page.goto("/projects/10k-kb/");
  const details = page.locator("details", { has: page.locator("summary", { hasText: "Known limits & sample caveats" }) });
  expect(await details.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
  // textContent, not innerText: the closed disclosure's body is not rendered on screen.
  const limits = (await details.locator(":scope > :not(summary)").first().textContent()) ?? "";
  await page.emulateMedia({ media: "print" });
  const printed = await printedText(page);
  expectEndsPrinted(printed, limits, "Known limits");
  // Screen behaviour is unchanged: the disclosure is still closed.
  expect(await details.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
});

test("Beckett case study prints all three preview panels", async ({ page }) => {
  await page.goto("/projects/beckett-diligence/");
  await expect(page.locator("[data-beckett-panel]")).toHaveCount(3);
  await expect(page.locator('[data-beckett-panel="committee"]')).toBeHidden();
  await page.emulateMedia({ media: "print" });
  for (const panel of ["fact-basis", "committee", "journal"]) {
    await expect(page.locator(`[data-beckett-panel="${panel}"]`), panel).toBeVisible();
  }
  const printed = compact(await printedText(page));
  for (const marker of ["DOC-SOURCED", "Combined verdict", "hypotheses_considered"]) {
    expect(printed, marker).toContain(compact(marker));
  }
});
