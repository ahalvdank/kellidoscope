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

const SYNC_HINT = "Run `node scripts/sync-traces.mjs <SRC>` to copy the featured traces.";

/**
 * Manifest to use. A synced manifest always wins. Without one, only dev may derive a manifest
 * from the loaded traces; production throws so a build can never ship an empty or dev site.
 */
export function resolveManifest(
  synced: TraceManifest | undefined,
  traces: Trace[],
  isProd: boolean,
): TraceManifest {
  if (synced) return synced;
  if (isProd) throw new Error(`No src/data/traces/manifest.json in a production build. ${SYNC_HINT}`);
  return buildManifest(traces);
}

/**
 * Traces for the featured manifest entries, in manifest order. A trace file whose slug is not
 * featured in the manifest is ignored; a featured entry with no file throws.
 */
export function selectFeatured(traces: Trace[], manifest: TraceManifest): Trace[] {
  const bySlug = new Map(traces.map((t) => [t.slug, t]));
  return manifest.traces
    .filter((entry) => entry.featured)
    .map((entry) => {
      const trace = bySlug.get(entry.slug);
      if (!trace) throw new Error(`Manifest lists "${entry.slug}" but it has no trace file. ${SYNC_HINT}`);
      return trace;
    });
}

/** Every bundled trace file, featured or not; exported for the glob test. Pages use loadAllTraces. */
export const loadRawTraces = (): Trace[] => Object.values(traceModules).map((mod) => mod.default);

/** The synced manifest (featured traces only); a derived one in dev when none is synced. */
export function getManifest(): TraceManifest {
  return resolveManifest(Object.values(manifestModules)[0]?.default, loadRawTraces(), import.meta.env.PROD);
}

/** Featured traces only, in manifest order. */
export function loadAllTraces(): Trace[] {
  return selectFeatured(loadRawTraces(), getManifest());
}

/** Build-time lookup of a featured trace; throws for any other slug. */
export function getTrace(slug: string): Trace {
  const trace = loadAllTraces().find((t) => t.slug === slug);
  if (!trace) throw new Error(`No featured trace for slug "${slug}"`);
  return trace;
}

export function listFeaturedSlugs(): string[] {
  return getManifest()
    .traces.filter((t) => t.featured)
    .map((t) => t.slug);
}
