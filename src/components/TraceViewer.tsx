import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Passage, Trace, TraceCategory, TraceManifest } from "../data/types";
import { getEntityBucket } from "../data/entityBuckets";
import { trackEvent } from "../lib/analytics";

interface TraceViewerProps {
  manifest: TraceManifest;
  initialTrace?: Trace;
  allTraces?: Trace[];
  traceBaseUrl?: string;
}

const CATEGORY_LABELS: Record<TraceCategory | "all", string> = {
  all: "All Traces",
  risk_shift: "Risk Shifts",
  contradiction: "Contradictions",
  capital_structure: "Capital Structure",
  cross_company: "Cross-Company",
};

type InspectorTab = "sources" | "claims" | "signals" | "audit";

export default function TraceViewer({
  manifest,
  initialTrace,
  allTraces = [],
  traceBaseUrl = "/data/traces",
}: TraceViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<TraceCategory | "all">("all");
  const [activeTrace, setActiveTrace] = useState<Trace | null>(initialTrace ?? null);
  const [activeTab, setActiveTab] = useState<InspectorTab>("sources");
  const [showRejected, setShowRejected] = useState(false);
  const [expandedJsonIdx, setExpandedJsonIdx] = useState<number | null>(null);
  const [highlightedCite, setHighlightedCite] = useState<number | null>(null);
  const [modalPassage, setModalPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    trackEvent("demo_opened", { slug: initialTrace?.slug ?? "index" });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalPassage && !dialog.open) {
      dialog.showModal();
    } else if (!modalPassage && dialog.open) {
      dialog.close();
    }
  }, [modalPassage]);

  const filteredSummaries = useMemo(() => {
    if (selectedCategory === "all") return manifest.traces;
    return manifest.traces.filter((t) => t.category === selectedCategory);
  }, [manifest.traces, selectedCategory]);

  async function selectTrace(slug: string) {
    if (activeTrace?.slug === slug) return;
    setError(null);
    setHighlightedCite(null);
    setExpandedJsonIdx(null);
    trackEvent("trace_selected", { slug });

    const localHit = allTraces.find((t) => t.slug === slug);
    if (localHit) {
      setActiveTrace(localHit);
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `/demos/10k-kb/q/${slug}/`);
      }
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(`${traceBaseUrl}/${slug}.json`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to load trace (${res.status})`);
      const data: Trace = await res.json();
      setActiveTrace(data);
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `/demos/10k-kb/q/${slug}/`);
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Could not load trace.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleCitationClick(citeNum: number) {
    if (!activeTrace) return;
    trackEvent("citation_clicked", { slug: activeTrace.slug, cite: citeNum });
    const passage = activeTrace.passages.find((p) => p.cite === citeNum);
    if (!passage) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (isMobile) {
      setModalPassage(passage);
      return;
    }

    setActiveTab("sources");
    setHighlightedCite(citeNum);
    setTimeout(() => {
      const el = document.getElementById(`passage-cite-${citeNum}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  // Convert [1], [2] markers into clickable markdown links (#cite-1)
  const linkedAnswerMd = useMemo(() => {
    if (!activeTrace) return "";
    return activeTrace.answer_md.replace(/\[(\d+)\]/g, "[[$1]](#cite-$1)");
  }, [activeTrace]);

  const includedPassages = useMemo(
    () => activeTrace?.passages.filter((p) => p.included) ?? [],
    [activeTrace]
  );
  const rejectedPassages = useMemo(
    () => activeTrace?.passages.filter((p) => !p.included) ?? [],
    [activeTrace]
  );

  if (!activeTrace && !loading) {
    return (
      <div className="rounded-lg border border-workspace-border bg-workspace-surface p-8 text-center">
        <p className="text-sm text-workspace-muted">No traces available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Corpus Badge */}
      <div className="flex flex-col gap-3 border-b border-workspace-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-editorial-accent">
            Query Traces · Deterministic Replay
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-workspace-ink">
            10-K Knowledge Base Inspector
          </h1>
          <p className="mt-1 text-sm text-workspace-muted">
            Deterministic replay of real pipeline runs (zero live API latency or cost).
          </p>
        </div>
        <div className="rounded-md border border-workspace-border bg-workspace-surface px-3 py-2 font-mono text-xs text-workspace-muted">
          Sample: {manifest.sample.companies.length} companies · {manifest.sample.filings} 10-Ks | Full private system: {manifest.full_corpus.companies} companies · {manifest.full_corpus.filings} filings
        </div>
      </div>

      {/* Category Filter Pills & Trace Picker */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trace categories">
          {(Object.keys(CATEGORY_LABELS) as (TraceCategory | "all")[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? "border-editorial-accent bg-editorial-accent text-white"
                  : "border-workspace-border bg-workspace-surface text-workspace-muted hover:text-workspace-ink"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {filteredSummaries.map((item) => {
            const isSelected = activeTrace?.slug === item.slug;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => selectTrace(item.slug)}
                className={`rounded-md border p-3 text-left transition ${
                  isSelected
                    ? "border-editorial-accent bg-indigo-50/40 ring-1 ring-editorial-accent"
                    : "border-workspace-border bg-workspace-surface hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-medium text-editorial-accent">
                    {item.tickers.join(", ")}
                  </span>
                  <span className="font-mono text-[10px] text-workspace-muted">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-workspace-ink">
                  {item.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Skeleton States */}
      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-lg bg-slate-200 lg:col-span-7" />
          <div className="h-72 animate-pulse rounded-lg bg-slate-200 lg:col-span-5" />
        </div>
      )}

      {/* Active Trace Content */}
      {activeTrace && !loading && (
        <>
          {/* Always-visible technical metadata strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-workspace-border bg-workspace-surface px-3 py-2 font-mono text-[11px] text-workspace-muted">
            <span>Embed: {activeTrace.meta.models.embedding}</span>
            <span>Extract: {activeTrace.meta.models.extraction}</span>
            <span>Top-k: {activeTrace.meta.top_k}</span>
            <span>Demo cutoff: score ≥ {activeTrace.meta.display_cutoff.toFixed(2)}</span>
            <a
              href={manifest.export_script_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("repo_clicked", { source: "trace_meta" })}
              className="text-editorial-accent underline"
            >
              commit {activeTrace.meta.build_commit.slice(0, 7)}
            </a>
          </div>

          {/* 60 / 40 Desktop Split */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column (60% -> 7 cols): Question + Cited Answer */}
            <section className="space-y-4 rounded-lg border border-workspace-border bg-workspace-surface p-5 lg:col-span-7">
              <div>
                <p className="font-mono text-xs text-workspace-muted">QUESTION</p>
                <h2 className="mt-1 text-lg font-semibold text-workspace-ink">
                  {activeTrace.question}
                </h2>
              </div>

              <div className="flex flex-wrap gap-3 border-y border-workspace-border py-2 font-mono text-xs text-workspace-muted">
                <span>{includedPassages.length} passages above cutoff</span>
                <span>{rejectedPassages.length} rejected</span>
                <span>{activeTrace.claims.length} extracted claims</span>
              </div>

              <div className="prose prose-sm max-w-none text-workspace-ink">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => {
                      if (href?.startsWith("#cite-")) {
                        const num = Number(href.replace("#cite-", ""));
                        return (
                          <button
                            type="button"
                            onClick={() => handleCitationClick(num)}
                            className="mx-0.5 inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs font-medium text-editorial-accent hover:bg-indigo-100"
                          >
                            {children}
                          </button>
                        );
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-words text-editorial-accent underline"
                        >
                          {children}
                        </a>
                      );
                    },
                    table: ({ children }) => (
                      <div className="my-4 overflow-x-auto">
                        <table className="min-w-full border-collapse border border-workspace-border text-xs">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-workspace-border bg-slate-50 px-2 py-1.5 text-left font-medium">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-workspace-border px-2 py-1.5">
                        {children}
                      </td>
                    ),
                    pre: ({ children }) => (
                      <pre className="overflow-x-auto rounded bg-slate-900 p-3 font-mono text-xs text-slate-100">
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {linkedAnswerMd}
                </ReactMarkdown>
              </div>
            </section>

            {/* Right Column (40% -> 5 cols): Tabbed Evidence Inspector */}
            <aside className="flex flex-col rounded-lg border border-workspace-border bg-workspace-surface lg:col-span-5">
              <div className="flex border-b border-workspace-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("sources")}
                  className={`flex-1 px-3 py-2.5 ${
                    activeTab === "sources"
                      ? "border-b-2 border-editorial-accent text-editorial-accent"
                      : "text-workspace-muted hover:text-workspace-ink"
                  }`}
                >
                  Sources ({includedPassages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("claims")}
                  className={`flex-1 px-3 py-2.5 ${
                    activeTab === "claims"
                      ? "border-b-2 border-editorial-accent text-editorial-accent"
                      : "text-workspace-muted hover:text-workspace-ink"
                  }`}
                >
                  Claims ({activeTrace.claims.length})
                </button>
                {activeTrace.signals && activeTrace.signals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("signals")}
                    className={`flex-1 px-3 py-2.5 ${
                      activeTab === "signals"
                        ? "border-b-2 border-editorial-accent text-editorial-accent"
                        : "text-workspace-muted hover:text-workspace-ink"
                    }`}
                  >
                    Signals
                  </button>
                )}
                {activeTrace.audit_note_md && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("audit")}
                    className={`flex-1 px-3 py-2.5 ${
                      activeTab === "audit"
                        ? "border-b-2 border-editorial-accent text-editorial-accent"
                        : "text-workspace-muted hover:text-workspace-ink"
                    }`}
                  >
                    Audit Note
                  </button>
                )}
              </div>

              <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
                {activeTab === "sources" && (
                  <>
                    {includedPassages.map((p, idx) => (
                      <PassageCard
                        key={`${p.accession}-${idx}`}
                        passage={p}
                        highlighted={p.cite !== null && p.cite === highlightedCite}
                      />
                    ))}

                    {rejectedPassages.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRejected((v) => !v)}
                          className="w-full rounded border border-dashed border-workspace-border py-2 font-mono text-xs text-workspace-muted hover:text-workspace-ink"
                        >
                          {showRejected ? "Hide" : "Show"} {rejectedPassages.length} rejected candidates (score &lt; {activeTrace.meta.display_cutoff.toFixed(2)})
                        </button>
                        {showRejected && (
                          <div className="mt-3 space-y-3 opacity-80">
                            {rejectedPassages.map((p, idx) => (
                              <PassageCard key={`rej-${idx}`} passage={p} highlighted={false} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "claims" && (
                  <div className="space-y-3">
                    {activeTrace.claims.map((c, idx) => {
                      const bucket = getEntityBucket(c.entity_type);
                      const isExpanded = expandedJsonIdx === idx;
                      return (
                        <div
                          key={idx}
                          className={`rounded-md border border-workspace-border border-l-4 ${bucket.borderClass} p-3 text-xs`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${bucket.pillClass}`}>
                              {bucket.label} · {c.entity_type}
                            </span>
                            <span className="font-mono text-[11px] text-workspace-muted">
                              {c.ticker} · {c.claim_type}
                            </span>
                          </div>
                          <p className="mt-2 font-medium text-workspace-ink">{c.entity}</p>
                          <p className="mt-1 text-workspace-muted">{c.statement}</p>
                          {c.relationship && (
                            <p className="mt-1 font-mono text-[11px] text-workspace-muted">
                              {c.relationship.type} → {c.relationship.target}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedJsonIdx(isExpanded ? null : idx)}
                            className="mt-2 font-mono text-[11px] text-editorial-accent underline"
                          >
                            {isExpanded ? "Hide raw JSON" : "View raw extraction JSON"}
                          </button>
                          {isExpanded && (
                            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 font-mono text-[11px] text-slate-100">
                              {JSON.stringify(c.raw_extraction, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === "signals" && activeTrace.signals && (
                  <div className="space-y-3">
                    <p className="rounded bg-amber-50 p-2 font-mono text-[11px] text-amber-900">
                      Shadow mode only: signals are computed for research and do not drive trades.
                    </p>
                    {activeTrace.signals.map((s, idx) => (
                      <div key={idx} className="rounded-md border border-workspace-border p-3 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-semibold text-workspace-ink">
                            {s.ticker} · {s.section}
                          </span>
                          <span className="text-workspace-muted">
                            FY{s.prior_fy} → FY{s.current_fy}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 font-mono text-[11px]">
                          <span>Tone shift: {s.tone_shift !== null ? s.tone_shift.toFixed(3) : "n/a"}</span>
                          <span>FinBERT: {s.sentiment_shift !== null ? s.sentiment_shift.toFixed(3) : "n/a"}</span>
                        </div>
                        {s.claim_diff && (
                          <div className="mt-2 space-y-1 border-t border-workspace-border pt-2">
                            {s.claim_diff.added.map((a, i) => (
                              <p key={`a-${i}`} className="text-emerald-800">+ {a}</p>
                            ))}
                            {s.claim_diff.removed.map((r, i) => (
                              <p key={`r-${i}`} className="text-rose-800">- {r}</p>
                            ))}
                            {s.claim_diff.changed.map((ch, i) => (
                              <p key={`c-${i}`} className="text-workspace-muted">
                                Δ {ch.before} → <span className="text-workspace-ink">{ch.after}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "audit" && activeTrace.audit_note_md && (
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-mono text-xs text-workspace-ink">
                    {activeTrace.audit_note_md}
                  </pre>
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Native <dialog> for Mobile Citations */}
      <dialog
        ref={dialogRef}
        onClose={() => setModalPassage(null)}
        className="w-[92vw] max-w-lg rounded-lg border border-workspace-border bg-workspace-surface p-4 shadow-xl"
      >
        {modalPassage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-editorial-accent">
                Citation [{modalPassage.cite}]
              </span>
              <button
                type="button"
                onClick={() => setModalPassage(null)}
                className="rounded px-2 py-1 text-xs text-workspace-muted hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <PassageCard passage={modalPassage} highlighted={false} />
          </div>
        )}
      </dialog>
    </div>
  );
}

function PassageCard({
  passage,
  highlighted,
}: {
  passage: Passage;
  highlighted: boolean;
}) {
  return (
    <article
      id={passage.cite !== null ? `passage-cite-${passage.cite}` : undefined}
      className={`rounded-md border p-3 text-xs transition ${
        highlighted
          ? "border-editorial-accent bg-indigo-50/50 ring-2 ring-editorial-accent/30"
          : "border-workspace-border bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
        <span className="font-semibold text-workspace-ink">
          {passage.cite !== null ? `[${passage.cite}] ` : ""}
          {passage.ticker} {passage.form} FY{passage.fiscal_year}
        </span>
        <span className="text-workspace-muted">
          score {passage.score.toFixed(3)}
        </span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-workspace-muted">
        {passage.section} · Filed {passage.filed}
      </p>
      <p className="mt-2 leading-relaxed text-workspace-muted">
        {passage.context.before}{" "}
        <mark className="rounded bg-amber-100 px-0.5 text-workspace-ink">
          {passage.context.match}
        </mark>{" "}
        {passage.context.after}
      </p>
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-workspace-muted">
        <span className="truncate">Acc: {passage.accession}</span>
        <a
          href={passage.sec_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("sec_link_clicked", { ticker: passage.ticker })}
          className="shrink-0 text-editorial-accent underline"
        >
          Open official SEC filing ↗
        </a>
      </div>
    </article>
  );
}
