import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertPublicAsset, assertPublicAssets, publicAssetExists, resolvePreview } from "../src/lib/assets";
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
