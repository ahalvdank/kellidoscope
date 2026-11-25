import { describe, expect, it } from "vitest";
import { prepareAuditNote } from "../src/lib/auditNote";

const NOTE = [
  "# Title",
  "",
  "## Claims",
  "",
  "- [[Claim A]] (Risk, X) on [[Co A|Company A]]: none cited",
  "- [[Claim B]] (Risk, X) on [[Co B]]: [2]",
  "- [[Claim C]] (Risk, X) on [[Co C]]: None Cited",
].join("\n");

describe("prepareAuditNote", () => {
  it('hides "none cited" lines and counts them', () => {
    const { md, hiddenCount } = prepareAuditNote(NOTE, false);
    expect(hiddenCount).toBe(2);
    expect(md).not.toMatch(/none cited/i);
    expect(md).toContain("Claim B");
    expect(md).toContain("# Title");
  });

  it("keeps them when showUncited, and still reports the count", () => {
    const { md, hiddenCount } = prepareAuditNote(NOTE, true);
    expect(hiddenCount).toBe(2);
    expect(md.match(/none cited/gi)).toHaveLength(2);
  });

  it("turns [[wiki-links]] into plain text", () => {
    const { md } = prepareAuditNote(NOTE, true);
    expect(md).not.toContain("[[");
    expect(md).not.toContain("]]");
    expect(md).toContain("- Claim A (Risk, X) on Company A: none cited");
    expect(md).toContain("- Claim B (Risk, X) on Co B: [2]");
  });

  it("returns zero hidden lines for a note without any", () => {
    expect(prepareAuditNote("# T\n\nplain", false)).toEqual({ md: "# T\n\nplain", hiddenCount: 0 });
  });
});
