import type { Trace, TraceManifest } from "./types";

const traceModules = import.meta.glob<{ default: Trace }>("./traces/*.json", {
  eager: true,
});

export function loadAllTraces(): Trace[] {
  const isProd = import.meta.env.PROD;
  const traces: Trace[] = [];

  for (const [path, mod] of Object.entries(traceModules)) {
    const filename = path.split("/").pop() ?? "";
    if (isProd && filename.startsWith("_DEV_")) {
      continue;
    }
    if (filename === "manifest.json") {
      continue;
    }
    traces.push(mod.default);
  }

  return traces;
}

export function buildManifest(traces: Trace[]): TraceManifest {
  const first = traces[0];
  const companies = Array.from(
    new Set(traces.flatMap((t) => t.tickers))
  ).sort();

  return {
    pipeline_version: "v1-static",
    build_commit: first?.meta.build_commit ?? "dev",
    export_script_url: "https://github.com/ahalvdank/10k-kb-public",
    run_timestamp: first?.meta.run_timestamp ?? new Date().toISOString(),
    sample: { companies, filings: companies.length * 2 },
    full_corpus: { companies: 186, filings: 973 },
    traces: traces.map(({ slug, title, question, category, tickers }) => ({
      slug,
      title,
      question,
      category,
      tickers,
    })),
  };
}
