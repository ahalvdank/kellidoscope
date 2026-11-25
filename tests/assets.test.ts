import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { statSync } from "node:fs";
import { assertPublicAsset, assertPublicAssets, publicAssetExists, resolveClip, resolvePreview } from "../src/lib/assets";
import { siteConfig } from "../src/data/siteConfig";

describe("publicAssetExists", () => {
  it("is true for public/media/kb-explorer-poster.jpg", () => {
    expect(publicAssetExists("/media/kb-explorer-poster.jpg")).toBe(true);
  });

  it.each([null, undefined, "", "/media/nope.jpg", "../package.json", "/media/../../package.json"])(
    "is false for %j",
    (path) => {
      expect(publicAssetExists(path)).toBe(false);
    },
  );
});

describe("assertPublicAsset", () => {
  it("passes for null and for a file that exists", () => {
    expect(() => assertPublicAsset(null)).not.toThrow();
    expect(() => assertPublicAsset("/media/kb-explorer-poster.jpg")).not.toThrow();
  });

  it("throws for a set path whose file is missing", () => {
    expect(() => assertPublicAsset("/media/nope.jpg")).toThrow("Missing media file: /media/nope.jpg");
  });
});

describe("assertPublicAssets", () => {
  it("passes when every path is null or exists, and names the first missing one", () => {
    expect(() => assertPublicAssets(null, "/media/kb-explorer-poster.jpg")).not.toThrow();
    expect(() => assertPublicAssets(null, "/media/nope.jpg", "/media/nope2.jpg")).toThrow(
      "Missing media file: /media/nope.jpg",
    );
  });
});

describe("resolvePreview", () => {
  it("returns the siteConfig value for a known key and null for an unset one", () => {
    expect(resolvePreview("classTastingPreview", { ...siteConfig, classTastingPreview: "/media/x.jpg" })).toBe("/media/x.jpg");
    expect(resolvePreview("classTastingPreview")).toBeNull();
  });

  it("throws for an unknown key or a key that is not a preview", () => {
    expect(() => resolvePreview("blindTastingPrevew")).toThrow('"blindTastingPrevew"');
    expect(() => resolvePreview("cellarApp")).toThrow('"cellarApp"');
  });

  it("every wine card in copy-home.md names a preview key that resolves", () => {
    const home = readFileSync("content/copy-home.md", "utf8");
    const keys = [...home.matchAll(/^\s+preview: (\S+)$/gm)].map((m) => m[1]);
    expect(keys).toEqual(["blindTastingPreview", "cellarPreview", "classTastingPreview"]);
    for (const key of keys) expect(() => resolvePreview(key)).not.toThrow();
    expect([...home.matchAll(/^\s+previewAlt: /gm)]).toHaveLength(3);
  });
});

describe("resolveClip", () => {
  it("returns the clip and its poster for a set key, and null for an unset one", () => {
    const config = { ...siteConfig, cellarClip: "/media/c.mp4", cellarClipPoster: "/media/c.jpg" };
    expect(resolveClip("cellarClip", config)).toEqual({ src: "/media/c.mp4", poster: "/media/c.jpg" });
    expect(resolveClip("cellarClip", { ...siteConfig, cellarClip: null })).toBeNull();
  });

  it("throws for an unknown key, a poster key or a key that is not a clip", () => {
    expect(() => resolveClip("blindTastingClp")).toThrow('"blindTastingClp"');
    expect(() => resolveClip("blindTastingClipPoster")).toThrow('"blindTastingClipPoster"');
    expect(() => resolveClip("systemClipUrl")).toThrow('"systemClipUrl"');
  });

  it("every clip key in copy-home.md resolves and has a caption", () => {
    const home = readFileSync("content/copy-home.md", "utf8");
    const keys = [...home.matchAll(/^\s+clip: (\S+)$/gm)].map((m) => m[1]);
    expect(keys).toEqual(["blindTastingClip", "cellarClip"]);
    for (const key of keys) expect(() => resolveClip(key)).not.toThrow();
    expect([...home.matchAll(/^\s+clipCaption: /gm)]).toHaveLength(2);
  });

  it("ships the configured blind-tasting clip, poster and thumbnail, the clip under 5,000,000 bytes", () => {
    const clip = resolveClip("blindTastingClip");
    expect(clip).not.toBeNull();
    for (const path of [clip!.src, clip!.poster, siteConfig.blindTastingPreview]) expect(publicAssetExists(path)).toBe(true);
    const bytes = statSync(join("public", clip!.src)).size;
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(5_000_000);
  });
});
