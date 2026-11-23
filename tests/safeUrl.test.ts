import { describe, expect, it } from "vitest";
import { safeUrl } from "../src/lib/safeUrl";

const SEC = ["sec.gov", "www.sec.gov"];

describe("safeUrl", () => {
  it("accepts https URLs on allowlisted hosts and returns them unchanged", () => {
    const url = "https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm";
    expect(safeUrl(url, SEC)).toBe(url);
    expect(safeUrl("https://sec.gov/x", SEC)).toBe("https://sec.gov/x");
    expect(safeUrl("https://github.com/ahalvdank/filings-kb/commit/abc", ["github.com"])).toBe(
      "https://github.com/ahalvdank/filings-kb/commit/abc",
    );
  });

  it("rejects javascript:, data:, http: and non-allowlisted hosts", () => {
    expect(safeUrl("javascript:alert(1)", SEC)).toBeNull();
    expect(safeUrl("data:text/html,<script>1</script>", SEC)).toBeNull();
    expect(safeUrl("http://www.sec.gov/x", SEC)).toBeNull();
    expect(safeUrl("https://evil.example/x", SEC)).toBeNull();
  });

  it("rejects look-alike hosts and embedded credentials", () => {
    expect(safeUrl("https://www.sec.gov.evil.example/x", SEC)).toBeNull();
    expect(safeUrl("https://evil-sec.gov/x", SEC)).toBeNull();
    expect(safeUrl("https://www.sec.gov@evil.example/x", SEC)).toBeNull();
    expect(safeUrl("https://user:pw@www.sec.gov/x", SEC)).toBeNull();
  });

  it("rejects empty, relative and unparseable input", () => {
    expect(safeUrl("", SEC)).toBeNull();
    expect(safeUrl("/relative/path", SEC)).toBeNull();
    expect(safeUrl("not a url", SEC)).toBeNull();
  });
});
