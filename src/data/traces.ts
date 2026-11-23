import type { Trace, TraceManifest } from "./types";

type TraceModules = Record<string, { default: Trace }>;
type ManifestModules = Record<string, { default: TraceManifest }>;

// Both branches are literal so Vite can analyse them. In production the negated patterns keep
// _DEV_ fixtures out of the bundle at compile time; the unused dev branch is tree-shaken.
const traceModules: TraceModules = import.meta.env.PROD
  ? import.meta.glob<{ default: Trace }>(
      ["./traces/*.json", "!./traces/_DEV_*.json", "!./traces/manifest.json"],
      { eager: true },
    )
  : import.meta.glob<{ default: Trace }>(["./traces/*.json", "!./traces/manifest.json"], {
      eager: true,
    });

const manifestModules: ManifestModules = import.meta.glob<{ default: TraceManifest }>(
  "./traces/manifest.json",
  { eager: true },
);

export function loadAllTraces(): Trace[] {
  return Object.values(traceModules).map((mod) => mod.default);
}

/**
 * Manifest derived from loaded traces. Used only when no synced manifest.json exists
 * (dev fixture, or a production build before the first sync).
 * `sample.filings` counts unique accessions across all passages.
 */
export function buildManifest(traces: Trace[]): TraceManifest {
  const first = traces[0];
  const companies = Array.from(new Set(traces.flatMap((t) => t.tickers))).sort();
  const accessions = new Set(traces.flatMap((t) => t.passages.map((p) => p.accession)));

  return {
    pipeline_version: "dev",
    build_commit: first?.meta.build_commit ?? "dev",
    export_script_url: "https://github.com/ahalvdank/filings-kb",
    run_timestamp: first?.meta.run_timestamp ?? "1970-01-01T00:00:00Z",
    sample: { companies, filings: accessions.size },
    full_corpus: { companies: 186, filings: 973 },
    traces: traces.map(({ slug, title, question, category, tickers }) => ({
      slug,
      title,
      question,
      category,
      tickers,
      featured: true,
    })),
  };
}

/** The synced manifest (featured traces only), or a derived one when none has been synced. */
export function getManifest(): TraceManifest {
  const synced = Object.values(manifestModules)[0]?.default;
  return synced ?? buildManifest(loadAllTraces());
}

/** Build-time lookup; throws for a slug with no trace file. */
export function getTrace(slug: string): Trace {
  const trace = loadAllTraces().find((t) => t.slug === slug);
  if (!trace) throw new Error(`No trace file for slug "${slug}"`);
  return trace;
}

export function listFeaturedSlugs(): string[] {
  return getManifest()
    .traces.filter((t) => t.featured)
    .map((t) => t.slug);
}
