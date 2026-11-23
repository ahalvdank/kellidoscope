import { describe, expect, it } from "vitest";
import { splitSections } from "../src/lib/sections";

const HTML = `<p>Lead.</p>
<h2 id="first">First</h2><p>One.</p>
<h2 id="second">Second</h2><p>Two.</p>`;

describe("splitSections", () => {
  it("returns the intro and each h2 section with its heading", () => {
    const s = splitSections(HTML, "t.md");
    expect(s.get("intro")).toBe("<p>Lead.</p>");
    expect(s.get("first")).toBe('<h2 id="first">First</h2><p>One.</p>');
    expect(s.get("second")).toBe('<h2 id="second">Second</h2><p>Two.</p>');
    expect(() => s.assertAllUsed()).not.toThrow();
  });

  it("has no intro when the copy starts with an h2", () => {
    const s = splitSections('<h2 id="a">A</h2>', "t.md");
    expect(() => s.get("intro")).toThrow(/no section "intro"/);
  });

  it("throws on a missing section, naming the file and the sections it has", () => {
    const s = splitSections(HTML, "t.md");
    expect(() => s.get("third")).toThrow(/t\.md: no section "third" \(have: intro, first, second\)/);
  });

  it("throws when a section is never placed on the page", () => {
    const s = splitSections(HTML, "t.md");
    s.get("intro");
    s.get("first");
    expect(() => s.assertAllUsed()).toThrow(/not placed on the page: second/);
  });

  it("throws on duplicate section ids", () => {
    expect(() => splitSections('<h2 id="a">A</h2><h2 id="a">A</h2>', "t.md")).toThrow(/duplicate section "a"/);
  });

  it("handles empty HTML", () => {
    const s = splitSections("", "t.md");
    expect(() => s.assertAllUsed()).not.toThrow();
  });
});
