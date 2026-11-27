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
    expect(html).toMatch(
      /<summary[^>]*>\s*Watch the clip<span class="sr-only"[^>]*>: Blind-tasting game<\/span>\s*<\/summary>/,
    );
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

  it("describes the video by its figcaption instead of repeating the caption as an aria-label", async () => {
    const html = await render({ recording: { src: "/media/x.mp4", poster: null, caption: "Screen recording of the thing." } });
    const video = html.match(/<video[^>]*>/)![0];
    expect(video).not.toContain("aria-label");
    const id = video.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toMatch(new RegExp(`<figcaption[^>]*id="${id}"[^>]*>\\s*Screen recording of the thing\\.\\s*</figcaption>`));
    expect(html.match(/Screen recording of the thing\./g)).toHaveLength(1);
  });

  it("gives each card's clip summary a distinct accessible name", async () => {
    const a = await render({ name: "Blind-tasting game", recording: { src: "/a.mp4", poster: null, caption: "a" } });
    const b = await render({ name: "Wine journal", recording: { src: "/b.mp4", poster: null, caption: "b" } });
    const summaryText = (html: string) => html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)![1].replace(/<[^>]+>/g, "");
    expect(summaryText(a)).toBe("Watch the clip: Blind-tasting game");
    expect(summaryText(b)).toBe("Watch the clip: Wine journal");
  });

  it("omits the poster attribute when the clip has none", async () => {
    const html = await render({ recording: { src: "/media/x.mp4", poster: null, caption: "c" } });
    expect(html).not.toContain("poster=");
  });
});

describe("ProjectCard layout", () => {
  it("renders the metric above the h3", async () => {
    const html = await render({ metric: "57 samples" });
    expect(html).toMatch(/<p[^>]*>\s*57 samples\s*<\/p>/);
    expect(html.indexOf("57 samples")).toBeLessThan(html.indexOf("<h3"));
  });

  it("renders the thumbnail <img> when the file exists under public/", async () => {
    const html = await render({ thumbnail: "/media/blind-tasting-thumb.jpg", thumbnailAlt: "A blind-tasting round" });
    expect(html).toMatch(/<img[^>]*src="\/media\/blind-tasting-thumb\.jpg"[^>]*>/);
    expect(html).toContain('alt="A blind-tasting round"');
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<h3"));
  });

  it.each([
    ["a missing file", "/media/does-not-exist.jpg"],
    ["null", null],
    ["a '..' path", "/media/../media/blind-tasting-thumb.jpg"],
  ])("renders no <img> for %s", async (_label, thumbnail) => {
    const html = await render({ thumbnail });
    expect(html).not.toContain("<img");
  });

  it("gives the first link the primary button class and later links the text-link class", async () => {
    const html = await render({
      links: [
        { label: "Play it", href: "blindTastingApp" },
        { label: "Code", href: "/projects/10k-kb" },
      ],
    });
    const anchors = html.match(/<a\b[^>]*>/g)!;
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toMatch(/class="[^"]*\bbg-editorial-accent\b[^"]*\bpx-3\b/);
    expect(anchors[0]).toMatch(/\brounded-md\b/);
    expect(anchors[1]).not.toContain("bg-editorial-accent");
    expect(anchors[1]).toMatch(/class="[^"]*hover:underline/);
  });
});

describe("ProjectCard class-tasting links", () => {
  it("renders 'Try the demo class' as the counted primary button, then 'See how it works' as a text link", async () => {
    const html = await render({
      name: "Class tasting",
      links: [
        { label: "Try the demo class", href: "classTastingDemo", event: "demo-class" },
        { label: "See how it works", href: "classTastingApp" },
      ],
    });
    const anchors = html.match(/<a\b[^>]*>[^<]*/g)!;
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toContain('href="https://class-tasting.kellidoscope.com/demo"');
    expect(anchors[0]).toContain('data-goatcounter-click="demo-class"');
    expect(anchors[0]).toContain("bg-editorial-accent");
    expect(anchors[0]).toContain("Try the demo class");
    expect(anchors[1]).toContain('href="https://class-tasting.kellidoscope.com"');
    expect(anchors[1]).not.toContain("data-goatcounter-click");
    expect(anchors[1]).toContain("See how it works");
  });
});

