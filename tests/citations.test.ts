import { describe, expect, it } from "vitest";
import { linkCitations } from "../src/lib/citations";

const valid = new Set([1, 2]);

describe("linkCitations", () => {
  it("links [n] only when n is a valid cite", () => {
    expect(linkCitations("Claim [1] and [2], not [3].", valid)).toBe(
      "Claim [[1]](#cite-1) and [[2]](#cite-2), not [3].",
    );
  });

  it("leaves markdown links like [2025](https://x) untouched, even when 2025 would be valid", () => {
    const md = "See [2025](https://example.com) and [1](https://example.com/1).";
    expect(linkCitations(md, new Set([1, 2025]))).toBe(md);
  });

  it("leaves fenced code blocks untouched (backtick and tilde) and links text after them", () => {
    const md = "a [1]\n```\ncode [1]\n```\nb [2]\n~~~py\nx [2]\n~~~\nc [1]";
    expect(linkCitations(md, valid)).toBe(
      "a [[1]](#cite-1)\n```\ncode [1]\n```\nb [[2]](#cite-2)\n~~~py\nx [2]\n~~~\nc [[1]](#cite-1)",
    );
  });

  it("treats an unclosed fence as running to the end of the text", () => {
    expect(linkCitations("a [1]\n```\nb [1]", valid)).toBe("a [[1]](#cite-1)\n```\nb [1]");
  });

  it("leaves inline code spans untouched", () => {
    expect(linkCitations("use `arr[1]` then [1] and ``a [2] ` b``", valid)).toBe(
      "use `arr[1]` then [[1]](#cite-1) and ``a [2] ` b``",
    );
  });

  it("handles adjacent cites and an empty cite set", () => {
    expect(linkCitations("x [1][2]", valid)).toBe("x [[1]](#cite-1)[[2]](#cite-2)");
    expect(linkCitations("x [1]", new Set())).toBe("x [1]");
    expect(linkCitations("", valid)).toBe("");
  });
});
