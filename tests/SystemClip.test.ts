import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SystemClip from "../src/components/SystemClip.astro";

describe("SystemClip", () => {
  it("renders nothing when there is no clip URL", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SystemClip, { props: { src: null } });
    expect(html.trim()).toBe("");
  });

  it("renders the video with its caption when a clip URL exists", async () => {
    const container = await AstroContainer.create();
    const src = "https://example.public.blob.vercel-storage.com/clip.mp4";
    const html = await container.renderToString(SystemClip, { props: { src } });
    expect(html).toContain('data-slot="system-clip"');
    expect(html).toContain(`src="${src}"`);
    expect(html).toContain("186 companies and 973 filings");
  });
});
