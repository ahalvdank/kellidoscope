import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import SystemClip from "../src/components/SystemClip.astro";
import { siteConfig } from "../src/data/siteConfig";

describe("SystemClip", () => {
  it("renders nothing when there is no clip URL", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SystemClip, { props: { src: null } });
    expect(html.trim()).toBe("");
  });

  it("renders the video with poster, caption and no autoplay when a clip URL exists", async () => {
    const container = await AstroContainer.create();
    const src = "/media/kb-explorer-clip.mp4";
    const poster = "/media/kb-explorer-poster.jpg";
    const html = await container.renderToString(SystemClip, { props: { src, poster } });
    expect(html).toContain('data-slot="system-clip"');
    expect(html).toContain(`src="${src}"`);
    expect(html).toContain(`poster="${poster}"`);
    for (const attr of ["playsinline", "muted", "controls", 'preload="metadata"']) expect(html).toContain(attr);
    expect(html).not.toMatch(/autoplay|\bloop\b/);
    expect(html).toContain(
      "Screen recording of my private KB Explorer (973 filings, 186 companies), limited to sample-company screens.",
    );
  });

  it("renders inside a ProductFrame carrying the full-system badge", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SystemClip, { props: { src: "/media/x.mp4" } });
    expect(html).toContain('role="group"');
    expect(html).toMatch(/data-frame-slot="badge"[^>]*>\s*Full private system · 186 companies \/ 973 filings\s*</);
    expect(html.indexOf('role="group"')).toBeLessThan(html.indexOf("<video"));
    expect(html.indexOf("<video")).toBeLessThan(html.indexOf("</figure>"));
  });

  it("omits the poster attribute when none is given", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SystemClip, { props: { src: "/media/x.mp4" } });
    expect(html).not.toContain("poster=");
  });

  it("ships the configured clip and poster, with the mp4 under 5 MB", () => {
    const publicPath = (url: string | null) => {
      expect(url).toMatch(/^\/media\//);
      return resolve("public", (url as string).slice(1));
    };
    const clip = publicPath(siteConfig.systemClipUrl);
    const poster = publicPath(siteConfig.systemClipPoster);
    expect(existsSync(poster)).toBe(true);
    expect(statSync(poster).size).toBeGreaterThan(0);
    expect(statSync(clip).size).toBeGreaterThan(0);
    expect(statSync(clip).size).toBeLessThan(5 * 1024 * 1024);
  });
});
