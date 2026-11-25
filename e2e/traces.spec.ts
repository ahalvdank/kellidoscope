import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

type Entry = { slug: string; title: string; question: string; featured: boolean };
const DATA = join(fileURLToPath(new URL("..", import.meta.url)), "public", "data", "traces");
const manifest: { build_commit: string; traces: Entry[] } = JSON.parse(
  readFileSync(join(DATA, "manifest.json"), "utf8"),
);
const featured = manifest.traces.filter((t) => t.featured);
const readTrace = (slug: string): { answer_md: string } =>
  JSON.parse(readFileSync(join(DATA, `${slug}.json`), "utf8"));

const SITE = "https://kellidoscope.com";
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const meta = (html: string, attr: "property" | "name", key: string) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  return m ? decode(m[1]) : null;
};
/** Visible text of server-rendered HTML: scripts/styles dropped, tags stripped, entities decoded. */
const visibleText = (html: string) =>
  decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " "),
  );
/** Opening words of the answer as plain text (markdown emphasis and [n] cite markers removed). */
const answerOpening = (answerMd: string) =>
  answerMd
    .replace(/\[\d+\]/g, "")
    .replace(/[*_`]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .join(" ");

test.describe("pre-rendered featured trace pages (no JS)", () => {
  test("the manifest features at least one trace", () => {
    expect(featured.length).toBeGreaterThan(0);
  });

  for (const t of featured) {
    test(`${t.slug}: unique <title> and OG tags carry the trace`, async ({ request }) => {
      const html = await (await request.get(`/demos/10k-kb/q/${t.slug}/`)).text();
      const canonical = `${SITE}/demos/10k-kb/q/${t.slug}/`;
      expect(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")).toContain(t.title);
      expect(meta(html, "property", "og:title")).toContain(t.title);
      expect(meta(html, "property", "og:description")).toBe(t.question);
      expect(meta(html, "property", "og:url")).toBe(canonical);
      expect(html).toContain(`<link rel="canonical" href="${canonical}"`);
      expect(meta(html, "property", "og:image")).toBe(`${SITE}/og-10k-demo.png`);
      expect(meta(html, "name", "twitter:card")).toBe("summary_large_image");
    });

    test(`${t.slug}: answer text is present in the HTML without JS`, async ({ request }) => {
      const html = await (await request.get(`/demos/10k-kb/q/${t.slug}/`)).text();
      const sentence = answerOpening(readTrace(t.slug).answer_md);
      expect(sentence.length).toBeGreaterThan(20);
      expect(visibleText(html)).toContain(sentence);
    });
  }

  test("titles are unique across featured traces", async ({ request }) => {
    const titles = new Set<string>();
    for (const t of featured) {
      const html = await (await request.get(`/demos/10k-kb/q/${t.slug}/`)).text();
      titles.add(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
    }
    expect(titles.size).toBe(featured.length);
  });
});

test.describe("page titles for home and case studies", () => {
  const pages: [string, RegExp][] = [
    ["/", /Auditable AI decision systems/],
    ["/projects/10k-kb/", /10-K .*knowledge base/i],
    ["/projects/beckett-diligence/", /Beckett/],
    ["/projects/portfolio-manager/", /Portfolio manager/],
    ["/demos/10k-kb/", /Query Traces/],
  ];
  test("each page has its own title and og:title", async ({ request }) => {
    const seen = new Set<string>();
    for (const [path, re] of pages) {
      const html = await (await request.get(path)).text();
      const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
      expect(title, path).toMatch(re);
      expect(meta(html, "property", "og:title"), path).toBe(title);
      seen.add(title);
    }
    expect(seen.size).toBe(pages.length);
  });
});

test.describe("trace viewer in the browser", () => {
  test("/demos/10k-kb renders the first featured trace", async ({ page }) => {
    await page.goto("/demos/10k-kb/");
    await expect(page.getByText(featured[0].question, { exact: false }).first()).toBeVisible();
    const html = await (await page.request.get("/demos/10k-kb/")).text();
    expect(visibleText(html)).toContain(answerOpening(readTrace(featured[0].slug).answer_md));
  });

  test("the metadata strip links the exported commit", async ({ page }) => {
    await page.goto(`/demos/10k-kb/q/${featured[0].slug}/`);
    const link = page.getByRole("link", { name: /exported at commit/ });
    await expect(link).toHaveAttribute(
      "href",
      `https://github.com/ahalvdank/filings-kb/commit/${manifest.build_commit}`,
    );
    await expect(link).toContainText(manifest.build_commit.slice(0, 7));
  });

  test("the answer starts above the fold at 1280x800", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/demos/10k-kb/q/${featured[0].slug}/`);
    const box = await page.locator("[data-trace-answer]").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(800);
  });

  test("switching trace fetches /data/traces/<slug>.json and updates the URL", async ({ page }) => {
    const target = featured[1];
    await page.goto(`/demos/10k-kb/q/${featured[0].slug}/`);
    await page.waitForLoadState("networkidle");
    const fetched = page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/data/traces/${target.slug}.json` && r.ok(),
    );
    await page.getByRole("button", { name: new RegExp(target.title.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
    await fetched;
    await expect(page).toHaveURL(new RegExp(`/demos/10k-kb/q/${target.slug}/$`));
  });
});
