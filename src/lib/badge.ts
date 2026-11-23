import type { TraceManifest } from "../data/types";

/** Fixed framing line shown wherever the traces are introduced. */
export const FRAMING_BANNER = "Deterministic replay of real pipeline runs: zero live API latency or cost.";

/** The demo badge, built from the manifest so it can never drift from the exported sample. */
export function sampleBadge(manifest: Pick<TraceManifest, "sample" | "full_corpus">): string {
  const { sample, full_corpus: full } = manifest;
  return `Sample: ${sample.companies.length} companies · ${sample.filings} filings | Full private system: ${full.companies} companies · ${full.filings} filings.`;
}
