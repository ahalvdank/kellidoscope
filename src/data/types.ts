// Trace contract. Mirrors schemas/trace.schema.json and schemas/manifest.schema.json
// from the filings-kb pipeline (copied to src/data/schemas/). tests/contract.test.ts
// validates every real export against both, so change types and schemas together.

export interface TraceManifest {
  pipeline_version: string;
  /** Full 40-char commit of the pipeline that produced the export. */
  build_commit: string;
  export_script_url: string;
  run_timestamp: string;
  /** `filings` is the count of unique accessions, not companies × 2. */
  sample: { companies: string[]; filings: number };
  full_corpus: { companies: number; filings: number };
  traces: TraceSummary[];
}

export type TraceCategory =
  | "risk_shift"
  | "contradiction"
  | "capital_structure"
  | "cross_company";

/** Fields shared by a manifest entry and the trace file it points to. */
export interface TraceHeader {
  slug: string;
  title: string;
  question: string;
  category: TraceCategory;
  tickers: string[];
}

/** Manifest entry. `featured` is always emitted by the export; the site lists featured traces only. */
export interface TraceSummary extends TraceHeader {
  featured: boolean;
}

export interface TraceModels {
  embedding: string;
  extraction: string;
  synthesis: string;
  sentiment: string;
}

export interface Trace extends TraceHeader {
  meta: {
    run_timestamp: string;
    /** Full 40-char commit; label it "exported at commit". */
    build_commit: string;
    models: TraceModels;
    top_k: number;
    max_passages: number;
    max_rejected: number;
    display_cutoff: number;
  };
  answer_md: string;
  passages: Passage[];
  claims: Claim[];
  signals?: Signal[];
  audit_note_md?: string;
}

export type PassageForm = "10-K" | "10-Q" | "10-K/A";

export interface Passage {
  /** Null for included passages the answer does not cite, and for rejected candidates. */
  cite: number | null;
  included: boolean;
  score: number;
  ticker: string;
  company: string;
  form: PassageForm;
  fiscal_year: number;
  filed: string;
  /** e.g. "Item 7 Management's Discussion and Analysis". */
  section: string;
  accession: string;
  sec_url: string;
  context: { before: string; match: string; after: string };
}

export type ClaimType =
  | "Risk"
  | "MaterialEvent"
  | "CapitalStructureEvent"
  | "LegalProceeding"
  | "CapitalReturn"
  | "GuidanceUpdate"
  | "RevenueSegment"
  | "ESGCommitment"
  | "InsiderTransaction";

export interface Claim {
  claim_type: ClaimType;
  entity_type: string;
  entity: string;
  ticker: string;
  statement: string;
  /** Allowed by the schema but never emitted by the export. */
  relationship?: { type: string; target: string };
  /** The extracted claim attributes only. */
  raw_extraction: unknown;
  /** Always present; null is the normal case (roughly 19% of claims carry a cite). */
  cite: number | null;
  superseded?: boolean;
}

export interface Signal {
  ticker: string;
  section: string;
  prior_fy: number;
  current_fy: number;
  tone_shift: number | null;
  sentiment_shift: number | null;
  claim_diff?: {
    added: string[];
    removed: string[];
    changed: { before: string; after: string }[];
  };
}
