import { describe, expect, it } from "vitest";
import { assertPublicAsset, publicAssetExists } from "../src/lib/assets";

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
