import { describe, expect, it } from "vitest";
import { publicAssetExists } from "../src/lib/assets";

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
