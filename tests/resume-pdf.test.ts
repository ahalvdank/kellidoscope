import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RESUME_PDF = join(__dirname, "..", "public", "andrew-kell-resume.pdf");
/** Served as a static download; keep it small enough to open instantly. */
const MAX_BYTES = 1024 * 1024;

describe("public résumé PDF", () => {
  it("exists and is a PDF under 1 MB", () => {
    const { size } = statSync(RESUME_PDF);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(MAX_BYTES);
    expect(readFileSync(RESUME_PDF).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
