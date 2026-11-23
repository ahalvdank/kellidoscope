export interface TraceManifest {
  pipeline_version: string;
  build_commit: string;
  export_script_url: string;
  run_timestamp: string;
  sample: { companies: string[]; filings: number };
  full_corpus: { companies: number; filings: number };
  traces: TraceSummary[];
}

export type TraceCategory =
  | "risk_shift"
  | "contradiction"
  | "capital_structure"
  | "cross_company";

export interface TraceSummary {
  slug: string;
  title: string;
  question: string;
  category: TraceCategory;
  tickers: string[];
}

export interface Trace extends TraceSummary {
  meta: {
    run_timestamp: string;
    build_commit: string;
    models: {
      embedding: string;
      extraction: string;
      synthesis: string;
    };
    top_k: number;
    display_cutoff: number;
  };
  answer_md: string;
  passages: Passage[];
  claims: Claim[];
  signals?: Signal[];
  audit_note_md?: string;
}

export interface Passage {
  cite: number | null;
  included: boolean;
  score: number;
  ticker: string;
  company: string;
  form: "10-K" | "10-Q";
  fiscal_year: number;
  filed: string;
  section: string;
  accession: string;
  sec_url: string;
  context: { before: string; match: string; after: string };
}

export interface Claim {
  claim_type: string;
  entity_type: string;
  entity: string;
  ticker: string;
  statement: string;
  relationship?: { type: string; target: string };
  raw_extraction: unknown;
  cite?: number;
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
