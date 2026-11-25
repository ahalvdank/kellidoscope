import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ProjectCard from "../src/components/ProjectCard.astro";

const BASE = {
  name: "Blind-tasting game",
  summary: "A summary.",
  links: [{ label: "Play it", href: "blindTastingApp" }],
  size: "secondary" as const,
};
const render = async (props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(ProjectCard, { props: { ...BASE, ...props } });

describe("ProjectCard clip", () => {
  it("renders no clip disclosure when the card has no clip", async () => {
    const html = await render({});
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<video");
  });

  it("renders a closed 'Watch the clip' disclosure with a framed, non-autoplaying video and its caption", async () => {
    const html = await render({
      recording: { src: "/media/x.mp4", poster: "/media/x-poster.jpg", caption: "Screen recording of the thing." },
    });
    expect(html).toMatch(/<details(?![^>]*\bopen\b)[^>]*data-slot="card-clip"/);
    expect(html).toMatch(/<summary[^>]*>\s*Watch the clip\s*<\/summary>/);
    expect(html).toMatch(/role="group"[^>]*aria-label="Blind-tasting game screen recording"/);
    expect(html).toContain('src="/media/x.mp4"');
    expect(html).toContain('poster="/media/x-poster.jpg"');
    for (const attr of ["controls", "muted", "playsinline", 'preload="metadata"']) expect(html).toContain(attr);
    expect(html).not.toMatch(/autoplay|\bloop\b/);
    expect(html).toContain("Screen recording of the thing.");
    expect(html.indexOf("<summary")).toBeLessThan(html.indexOf('role="group"'));
    expect(html.indexOf('role="group"')).toBeLessThan(html.indexOf("<video"));
    expect(html.indexOf("<video")).toBeLessThan(html.indexOf("</details>"));
  });

  it("omits the poster attribute when the clip has none", async () => {
    const html = await render({ recording: { src: "/media/x.mp4", poster: null, caption: "c" } });
    expect(html).not.toContain("poster=");
  });
});
