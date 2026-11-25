import { describe, expect, it } from "vitest";
import { copyViolations } from "../scripts/copy-rules.mjs";
import { extractFinding, LIVE_FINDING } from "../src/lib/liveFinding";
import { getTrace } from "../src/data/traces";
import type { Trace } from "../src/data/types";

const fakeTrace = (answer_md: string): Trace => ({ slug: "fake", answer_md }) as Trace;

describe("extractFinding", () => {
  it("finds the H20 charge sentence in the real NVDA trace", () => {
    const finding = extractFinding(getTrace(LIVE_FINDING.slug), LIVE_FINDING.needle);
    expect(finding.text).toContain(
      "$4.5 billion charge in the first quarter of fiscal year 2026 associated with H20",
    );
    expect(finding.cites.length).toBeGreaterThanOrEqual(1);
    expect(finding.href).toBe("/demos/10k-kb/q/nvda-export-control-risk-fy22-fy26/");
  });

  it("throws when the needle is absent", () => {
    expect(() => extractFinding(fakeTrace("One sentence. Another one."), "missing")).toThrow(
      "Live Finding: needle not found in fake",
    );
  });

  it("strips markdown emphasis and [n] markers from text", () => {
    const finding = extractFinding(
      fakeTrace("Intro here. The **big** charge was *huge* [2][4]. After that came more."),
      "big",
    );
    expect(finding.text).toBe("The big charge was huge.");
    expect(finding.cites).toEqual([2, 4]);
  });

  it("returns following sentences when extraSentences is set", () => {
    const finding = extractFinding(fakeTrace("First [1]. Second [2]. Third [3]. Fourth."), "Second", 1);
    expect(finding.text).toBe("Second. Third.");
    expect(finding.cites).toEqual([2, 3]);
  });

  it("the extracted finding passes the copy rules", () => {
    const finding = extractFinding(getTrace(LIVE_FINDING.slug), LIVE_FINDING.needle);
    expect(copyViolations(finding.text, { rendered: true, production: true })).toEqual([]);
  });
});
