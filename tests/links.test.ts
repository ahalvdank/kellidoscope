import { describe, expect, it } from "vitest";
import { isExternal, resolveHref } from "../src/lib/links";
import { siteConfig } from "../src/data/siteConfig";

describe("resolveHref", () => {
  it("keeps a site path", () => {
    expect(resolveHref("/projects/10k-kb")).toBe("/projects/10k-kb");
  });

  it("maps a siteConfig key to its URL", () => {
    expect(resolveHref("blindTastingRepo")).toBe(siteConfig.blindTastingRepo);
    expect(resolveHref("cellarApp")).toBe("https://cellar.kellidoscope.com");
  });

  it("rejects a raw URL or an unknown key", () => {
    expect(() => resolveHref("https://example.com")).toThrow(/neither a site path nor a siteConfig key/);
    expect(() => resolveHref("nope")).toThrow(/"nope"/);
    expect(() => resolveHref("toString")).toThrow();
  });
});

describe("isExternal", () => {
  it("is true only for http(s) URLs", () => {
    expect(isExternal("https://github.com/ahalvdank")).toBe(true);
    expect(isExternal("/projects/10k-kb")).toBe(false);
  });
});
