// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import typography from "@tailwindcss/typography";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TraceViewer from "../src/components/TraceViewer";
import { getManifest, getTrace, listFeaturedSlugs } from "../src/data/traces";
import type { Trace } from "../src/data/types";
import tailwindConfig from "../tailwind.config.mjs";

// Real featured traces. Facts verified against the synced data:
//  - BA: signals, audit note, zero rejected passages
//  - AMD amendment: no signals, superseded claims, 10-K/A passages, 10 rejected
//  - NVDA export control: signals and 10 rejected
const BA = getTrace("ba-liquidity-and-debt-fy24-fy25");
const AMD = getTrace("amd-fy2025-10ka-amendment");
const NVDA = getTrace("nvda-export-control-risk-fy22-fy26");
const MANIFEST = getManifest();
const BASE = "/demos/10k-kb/q";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
const ok = (trace: Trace) => ({ ok: true, status: 200, json: async () => trace }) as Response;

/** Serves traces by slug from `/data/traces/<slug>.json`. */
function stubFetch(handler: (slug: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn((url: string, init?: RequestInit) => {
    const slug = /\/([^/]+)\.json$/.exec(url)?.[1] ?? "";
    return handler(slug, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const serve = (...traces: Trace[]) =>
  stubFetch(async (slug) => {
    const t = traces.find((x) => x.slug === slug);
    if (!t) throw new Error(`unexpected fetch ${slug}`);
    return ok(t);
  });

function pick(trace: Trace) {
  fireEvent.click(screen.getByText(trace.title));
}
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const questionHeading = (trace: Trace) => screen.findByRole("heading", { name: trace.question });

beforeEach(() => {
  window.history.replaceState(null, "", `${BASE}/${BA.slug}/`);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tab and rejected-state reset on switch (C1.4)", () => {
  it("switching to a trace without signals resets the tab to sources", async () => {
    serve(AMD);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(tab(/Signals/));
    expect(tab(/Signals/).getAttribute("aria-selected")).toBe("true");

    pick(AMD);
    await questionHeading(AMD);

    expect(screen.queryByRole("tab", { name: /Signals/ })).toBeNull();
    expect(tab(/Sources/).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("10-K/A");
  });

  it("switching resets showRejected to false", async () => {
    serve(NVDA, AMD);
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    fireEvent.click(screen.getByRole("button", { name: /Show 10 rejected candidates/ }));
    expect(screen.getByRole("button", { name: /Hide 10 rejected candidates/ })).toBeTruthy();

    pick(AMD);
    await questionHeading(AMD);

    expect(screen.getByRole("button", { name: /Show 10 rejected candidates/ })).toBeTruthy();
  });
});

describe("empty rejected tab", () => {
  it("says no candidates fell below the cutoff, with the cutoff taken from meta", () => {
    expect(BA.passages.filter((p) => !p.included)).toHaveLength(0);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(
      screen.getByText("No candidates fell below the 0.35 cutoff for this question."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /rejected candidates/ })).toBeNull();
  });

  it("uses meta.display_cutoff rather than a constant", () => {
    const trace: Trace = {
      ...BA,
      meta: { ...BA.meta, display_cutoff: 0.5 },
    };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    expect(
      screen.getByText("No candidates fell below the 0.50 cutoff for this question."),
    ).toBeTruthy();
  });
});

describe("history (C1.5)", () => {
  it("pushes {slug} state when switching", async () => {
    serve(AMD);
    const push = vi.spyOn(window.history, "pushState");
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    pick(AMD);
    await questionHeading(AMD);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ slug: AMD.slug }, "", `${BASE}/${AMD.slug}/`);
  });

  it("popstate loads the trace for event.state.slug without pushing history", async () => {
    serve(AMD);
    const push = vi.spyOn(window.history, "pushState");
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { slug: AMD.slug } }));
    });
    await questionHeading(AMD);

    expect(push).not.toHaveBeenCalled();
  });

  it("popstate falls back to the pathname when state is null, and returns to the initial trace", async () => {
    serve(AMD);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);

    window.history.replaceState(null, "", `${BASE}/${AMD.slug}/`);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    await questionHeading(AMD);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { slug: BA.slug } }));
    });
    await questionHeading(BA);
  });

  it("popstate ignores a slug that is not in the manifest", async () => {
    const fetchFn = serve();
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { slug: "../../evil" } }));
    });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: BA.question })).toBeTruthy();
  });

  it("stamps the initial history entry with its slug so Back can return to it", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(window.history.state).toEqual({ slug: BA.slug });
  });
});

describe("fetch races (C2.3)", () => {
  it("rapid switch: an earlier slow fetch never overwrites a later trace", async () => {
    const slow = deferred<Response>();
    stubFetch((slug) => (slug === AMD.slug ? slow.promise : Promise.resolve(ok(NVDA))));
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);

    pick(AMD); // slow, ignores abort
    pick(NVDA);
    await questionHeading(NVDA);

    await act(async () => {
      slow.resolve(ok(AMD));
      await slow.promise;
    });

    expect(screen.getByRole("heading", { name: NVDA.question })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: AMD.question })).toBeNull();
    expect(window.location.pathname).toBe(`${BASE}/${NVDA.slug}/`);
  });

  it("switching back to the shown trace cancels a pending load", async () => {
    const slow = deferred<Response>();
    stubFetch(() => slow.promise);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);

    pick(AMD);
    pick(BA);
    await act(async () => {
      slow.resolve(ok(AMD));
      await slow.promise;
    });

    expect(screen.getByRole("heading", { name: BA.question })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: AMD.question })).toBeNull();
  });

  it("unmount aborts the in-flight fetch", () => {
    let signal: AbortSignal | null | undefined;
    stubFetch((_slug, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    });
    const { unmount } = render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    pick(AMD);
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("shows an error and keeps the current trace when the fetch fails", async () => {
    stubFetch(async () => ({ ok: false, status: 404 }) as Response);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    pick(AMD);
    expect((await screen.findByText(/Failed to load trace \(404\)/)).textContent).toBeTruthy();
    expect(screen.getByRole("heading", { name: BA.question })).toBeTruthy();
  });
});

describe("metadata strip (C2.2)", () => {
  it("shows embedding, extraction, synthesis and sentiment models", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const m = BA.meta.models;
    expect(screen.getByText(`Embed: ${m.embedding}`)).toBeTruthy();
    expect(screen.getByText(`Extract: ${m.extraction}`)).toBeTruthy();
    expect(screen.getByText(`Synthesize: ${m.synthesis}`)).toBeTruthy();
    expect(screen.getByText(`Sentiment: ${m.sentiment}`)).toBeTruthy();
  });

  it("labels the commit 'exported at commit' and links to the filings-kb commit", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const link = screen.getByRole("link", {
      name: `exported at commit ${BA.meta.build_commit.slice(0, 7)}`,
    });
    expect(link.getAttribute("href")).toBe(
      `https://github.com/ahalvdank/filings-kb/commit/${BA.meta.build_commit}`,
    );
  });
});

describe("claims tab", () => {
  it("claim with cite renders a citation badge that selects the passage (C2.5)", () => {
    const cited = BA.claims.find((c) => c.cite !== null)!;
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(tab(/Claims/));
    const badge = within(screen.getByRole("tabpanel")).getAllByRole("button", {
      name: `Go to citation ${cited.cite}`,
    })[0];
    fireEvent.click(badge);

    expect(tab(/Sources/).getAttribute("aria-selected")).toBe("true");
    const passage = document.getElementById(`passage-cite-${cited.cite}`)!;
    expect(passage.getAttribute("data-highlighted")).toBe("true");
  });

  it("every claim cite in the real traces resolves to a passage cite", () => {
    for (const slug of listFeaturedSlugs()) {
      const trace = getTrace(slug);
      const cites = new Set(trace.passages.map((p) => p.cite));
      for (const c of trace.claims) {
        if (c.cite !== null) expect(cites.has(c.cite), `${slug} claim cite ${c.cite}`).toBe(true);
      }
    }
  });

  it("a null cite is the normal case: no badge, and the card says it is not cited", () => {
    const uncited = BA.claims.filter((c) => c.cite === null).length;
    const cited = BA.claims.length - uncited;
    expect(uncited).toBeGreaterThan(0);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(tab(/Claims/));
    const panel = within(screen.getByRole("tabpanel"));
    expect(panel.getAllByRole("button", { name: /^Go to citation/ })).toHaveLength(cited);
    expect(panel.getAllByText("Not cited in the answer")).toHaveLength(uncited);
  });

  it("superseded claims carry a muted 'superseded by the 10-K/A' tag", () => {
    const superseded = AMD.claims.filter((c) => c.superseded).length;
    expect(superseded).toBeGreaterThan(0);
    render(<TraceViewer initialTrace={AMD} manifest={MANIFEST} />);
    fireEvent.click(tab(/Claims/));
    expect(
      within(screen.getByRole("tabpanel")).getAllByText("superseded by the 10-K/A"),
    ).toHaveLength(superseded);
  });

  it("does not render a claim relationship (never emitted by the export)", () => {
    const claim = { ...BA.claims[0], relationship: { type: "SUPPLIES", target: "ZZZ-TARGET" } };
    render(<TraceViewer initialTrace={{ ...BA, claims: [claim] }} manifest={MANIFEST} />);
    fireEvent.click(tab(/Claims/));
    expect(document.body.textContent).not.toContain("ZZZ-TARGET");
  });
});

describe("signals tab", () => {
  it("discloses FinBERT truncation and research-only use", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(tab(/Signals/));
    const text = screen.getByRole("tabpanel").textContent ?? "";
    expect(text).toContain("FinBERT sentiment truncates long chunks (about 26% of chunks)");
    expect(text).toContain("research-only and never used for trading decisions");
  });
});

describe("copy", () => {
  it("shows the exact demo badge and framing banner, and no '10-Ks' wording", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(
      screen.getByText(
        "Sample: 12 companies · 61 filings | Full private system: 186 companies · 973 filings.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Deterministic replay of real pipeline runs: zero live API latency or cost."),
    ).toBeTruthy();
    // Page chrome only: real answer text may legitimately say "10-Ks".
    const header = screen.getByRole("heading", { level: 1 }).closest("div")!.parentElement!;
    expect(header.textContent).not.toMatch(/10-Ks/);
  });

  it("renders the 10-K/A form on amendment passages", () => {
    render(<TraceViewer initialTrace={AMD} manifest={MANIFEST} />);
    expect(screen.getAllByText(/AMD 10-K\/A FY\d{4}/).length).toBeGreaterThan(0);
  });
});

describe("accessibility roles (C2.6)", () => {
  it("inspector has tablist/tab/tabpanel roles with aria-selected; category pills are a group with aria-pressed", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);

    const tablist = screen.getByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    expect(tabs.filter((t) => t.getAttribute("aria-selected") === "true")).toHaveLength(1);
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tab(/Sources/).id);
    expect(tab(/Sources/).getAttribute("aria-controls")).toBe(panel.id);

    const group = screen.getByRole("group", { name: "Trace categories" });
    const pills = within(group).getAllByRole("button");
    expect(pills.every((p) => p.getAttribute("aria-pressed") !== null)).toBe(true);
    expect(within(group).getByRole("button", { name: "All Traces" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(group).getByRole("button", { name: "Risk Shifts" }));
    expect(within(group).getByRole("button", { name: "Risk Shifts" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "All Traces" }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("URL safety (C1.9)", () => {
  it("markdown link with javascript: href renders as text", () => {
    const trace: Trace = { ...BA, answer_md: "Click [here](javascript:alert(1)) or [SEC](https://www.sec.gov/x)." };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    const answer = document.querySelector(".prose")!;
    expect(answer.textContent).toContain("here");
    expect(answer.querySelector('a[href^="javascript"]')).toBeNull();
    expect(within(answer as HTMLElement).queryByRole("link", { name: "here" })).toBeNull();
    expect(within(answer as HTMLElement).getByRole("link", { name: "SEC" }).getAttribute("href")).toBe(
      "https://www.sec.gov/x",
    );
  });

  it("markdown links to non-allowlisted hosts render as text", () => {
    const trace: Trace = { ...BA, answer_md: "See [evil](https://evil.example/x)." };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    expect(within(document.querySelector(".prose") as HTMLElement).queryByRole("link", { name: "evil" })).toBeNull();
  });

  it("a passage with an unsafe sec_url shows no SEC link", () => {
    const passages = BA.passages.map((p, i) => (i === 0 ? { ...p, sec_url: "javascript:alert(1)" } : p));
    render(<TraceViewer initialTrace={{ ...BA, passages }} manifest={MANIFEST} />);
    // Uncited passages sit behind a toggle; open it so every included passage is rendered.
    fireEvent.click(screen.getByRole("button", { name: /additional retrieved passages \(not cited\)/ }));
    const links = screen.getAllByRole("link", { name: /Open official SEC filing/ });
    expect(links).toHaveLength(passages.filter((p) => p.included).length - 1);
    expect(links.every((l) => l.getAttribute("href")!.startsWith("https://www.sec.gov/"))).toBe(true);
  });
});

describe("citation linking in the answer (C2.4)", () => {
  it("renders only valid [n] as citation buttons and leaves other brackets as text", () => {
    const trace: Trace = { ...BA, answer_md: "Valid [1], invalid [999], year [2025](https://www.sec.gov/y)." };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    const answer = within(document.querySelector(".prose") as HTMLElement);
    expect(answer.getByRole("button", { name: "[1]" })).toBeTruthy();
    expect(answer.queryByRole("button", { name: "[999]" })).toBeNull();
    expect(answer.getByRole("link", { name: "2025" })).toBeTruthy();
  });
});

describe("typography (C1.6)", () => {
  it("answer markdown renders headings and list markers inside a prose container, and the plugin is registered", () => {
    const trace: Trace = { ...BA, answer_md: "## Heading\n\n- one\n- two\n" };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    const prose = document.querySelector(".prose") as HTMLElement;
    expect(prose.className).toContain("prose-base");
    expect(prose.className).toContain("leading-relaxed");
    expect(within(prose).getByRole("heading", { name: "Heading" })).toBeTruthy();
    expect(within(prose).getAllByRole("listitem")).toHaveLength(2);
    expect(tailwindConfig.plugins).toContain(typography);
  });
});

describe("props contract (C1.7)", () => {
  it("renders from initialTrace and manifest alone", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(screen.getByRole("heading", { name: BA.question })).toBeTruthy();
  });
});

describe("analytics (Task 4)", () => {
  let count: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    count = vi.fn();
    window.goatcounter = { count };
  });
  afterEach(() => {
    delete window.goatcounter;
  });

  it("trace switch calls countPageview with the new path", async () => {
    serve(AMD);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(count).not.toHaveBeenCalled(); // count.js records the landing pageview itself
    pick(AMD);
    await questionHeading(AMD);
    expect(count).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith({ path: `${BASE}/${AMD.slug}/` });
  });

  it("Back/Forward (popstate) counts a pageview for the restored path", async () => {
    serve(AMD);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    window.history.replaceState({ slug: AMD.slug }, "", `${BASE}/${AMD.slug}/`);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { slug: AMD.slug } }));
    });
    await questionHeading(AMD);
    expect(count).toHaveBeenCalledWith({ path: `${BASE}/${AMD.slug}/` });
  });

  it("a citation button calls countEvent('citation')", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const answer = within(document.querySelector(".prose") as HTMLElement);
    fireEvent.click(answer.getAllByRole("button", { name: /^\[\d+\]$/ })[0]);
    expect(count).toHaveBeenCalledWith({ path: "citation", event: true });
  });

  it("an SEC filing link calls countEvent('sec-link')", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(screen.getAllByRole("link", { name: /Open official SEC filing/ })[0]);
    expect(count).toHaveBeenCalledWith({ path: "sec-link", event: true });
  });

  it("the exported-at-commit link calls countEvent('repo')", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(screen.getByRole("link", { name: /exported at commit/ }));
    expect(count).toHaveBeenCalledWith({ path: "repo", event: true });
  });

  it("island links do not also carry data-goatcounter-click (would double count)", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(document.querySelector("[data-goatcounter-click]")).toBeNull();
  });
});

describe("carry items from Task 3 review", () => {
  it("markdown images render as nothing (no third-party image requests)", () => {
    const trace: Trace = { ...BA, answer_md: "Before ![pixel](https://evil.example/p.png) after." };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    const prose = document.querySelector(".prose") as HTMLElement;
    expect(prose.querySelector("img")).toBeNull();
    expect(prose.textContent).toContain("Before");
    expect(prose.textContent).toContain("after.");
    expect(prose.textContent).not.toContain("pixel");
  });

  it("re-selecting the trace already in history.state does not push a duplicate entry", async () => {
    const slow = deferred<Response>();
    stubFetch(() => slow.promise);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    expect(window.history.state).toEqual({ slug: BA.slug });
    const push = vi.spyOn(window.history, "pushState");

    pick(AMD); // pending
    pick(BA); // cached, and history already points at BA

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: BA.question })).toBeTruthy();
    await act(async () => {
      slow.resolve(ok(AMD));
      await slow.promise;
    });
  });

  it("the picker lists featured traces only", () => {
    const hidden = { ...MANIFEST.traces[0], slug: "hidden-unfeatured", title: "Hidden unfeatured trace", featured: false };
    const manifest = { ...MANIFEST, traces: [...MANIFEST.traces, hidden] };
    render(<TraceViewer initialTrace={BA} manifest={manifest} />);
    expect(screen.queryByText("Hidden unfeatured trace")).toBeNull();
    const strip = screen.getByRole("navigation", { name: "Featured traces" });
    expect(within(strip).queryByText("Hidden unfeatured trace")).toBeNull();
    for (const t of MANIFEST.traces) expect(within(strip).getByText(t.title)).toBeTruthy();
  });

  it("the featured-trace strip is one scrollable row", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const strip = screen.getByRole("navigation", { name: "Featured traces" });
    const row = strip.firstElementChild as HTMLElement;
    expect(row.className).toContain("overflow-x-auto");
    expect(row.className).toContain("flex-nowrap");
    // The scroll container clips overflow, so it needs 1px of padding for the selected pill's ring.
    expect(row.className.split(/\s+/)).toContain("p-px");
    const current = within(strip).getAllByRole("button").filter((b) => b.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain(BA.title);
  });

  it("the metadata bar renders after the answer and inspector", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const commit = screen.getByRole("link", { name: /exported at commit/ });
    const inspector = document.getElementById("inspector-panel") as HTMLElement;
    expect(inspector.compareDocumentPosition(commit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("sources tab (phase 2)", () => {
  const uncitedCount = BA.passages.filter((x) => x.included && x.cite === null).length;
  const toggleName = new RegExp(`${uncitedCount} additional retrieved passages \\(not cited\\)`);
  const panel = () => screen.getByRole("tabpanel");
  const uncitedList = () => panel().querySelector("[data-uncited-list]") as HTMLElement;
  /** Cards shown on screen: jsdom has no CSS, so exclude the closed (`hidden`) uncited wrapper by class. */
  const screenCards = () =>
    Array.from(panel().querySelectorAll("article")).filter((a) => !a.closest("[data-uncited-list].hidden"));
  const shown = (card: Element, side: "before" | "after") =>
    (card.querySelector(`[data-ctx="${side}-clipped"], [data-ctx="${side}"]:not(.hidden)`) as HTMLElement).textContent;
  const longCited = () =>
    BA.passages.find((x) => x.cite !== null && x.context.before.length > 160) as Trace["passages"][number];

  it("renders only cited passages on screen by default, in [1], [2], [3] order", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const cited = BA.passages.filter((x) => x.included && x.cite !== null);
    expect(uncitedCount).toBeGreaterThan(0);
    expect(screenCards().map((a) => a.id)).toEqual(
      cited.map((x) => x.cite as number).sort((a, b) => a - b).map((n) => `passage-cite-${n}`)
    );
  });

  it('the toggle reads "Show N additional retrieved passages (not cited)" and reveals them', () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const before = screenCards().length;
    const btn = screen.getByRole("button", { name: toggleName });
    expect(btn.textContent).toMatch(/^Show /);
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: toggleName }).textContent).toMatch(/^Hide /);
    expect(screenCards().length).toBe(before + uncitedCount);
  });

  it("uncited passages are in the DOM behind a print-visible wrapper when the toggle is closed", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const list = uncitedList();
    expect(list.className).toContain("hidden");
    expect(list.className).toContain("print:block");
    expect(list.querySelectorAll("article")).toHaveLength(uncitedCount);
    expect(screen.getByRole("button", { name: toggleName }).className).toContain("print:hidden");
    fireEvent.click(screen.getByRole("button", { name: toggleName }));
    expect(uncitedList().className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("the rejected-candidates toggle still follows the uncited toggle", () => {
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    const uncited = screen.getByRole("button", { name: /additional retrieved passages/ });
    const rejected = screen.getByRole("button", { name: /rejected candidates/ });
    expect(uncited.compareDocumentPosition(rejected) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('long context is clipped with an "Expand full context" toggle per card, full text kept for print', () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const lc = longCited();
    const card = document.getElementById(`passage-cite-${lc.cite}`) as HTMLElement;
    expect(shown(card, "before")).not.toContain(lc.context.before);
    expect(shown(card, "before").startsWith("…")).toBe(true);
    const clippedSpan = card.querySelector('[data-ctx="before-clipped"]') as HTMLElement;
    expect(clippedSpan.className).toContain("print:hidden");
    const printSpan = card.querySelector('[data-ctx="before"]') as HTMLElement;
    expect(printSpan.className).toContain("hidden");
    expect(printSpan.className).toContain("print:inline");
    expect(printSpan.textContent).toBe(lc.context.before);
    fireEvent.click(within(card).getByRole("button", { name: "Expand full context" }));
    expect(shown(card, "before")).toBe(lc.context.before);
    fireEvent.click(within(card).getByRole("button", { name: "Collapse context" }));
    expect(shown(card, "before")).not.toContain(lc.context.before);
  });

  it("a citation click expands that card's context and highlights it", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    const target = BA.passages.find((x) => x.cite === 1) as Trace["passages"][number];
    const answer = within(document.querySelector(".prose") as HTMLElement);
    fireEvent.click(answer.getAllByRole("button", { name: "[1]" })[0]);
    const card = document.getElementById("passage-cite-1") as HTMLElement;
    expect(card.getAttribute("data-highlighted")).toBe("true");
    expect(shown(card, "before")).toBe(target.context.before);
    expect(shown(card, "after")).toBe(target.context.after);
  });

  it("a trace with no cited passages shows the uncited toggle, not an empty panel", () => {
    const trace: Trace = {
      ...BA,
      answer_md: "No citations here.",
      passages: BA.passages.map((x) => ({ ...x, cite: null })),
    };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    const n = trace.passages.filter((x) => x.included).length;
    expect(screenCards()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${n} additional retrieved passages`) }));
    expect(screenCards()).toHaveLength(n);
  });

  it("switching trace resets show-uncited and expanded contexts", async () => {
    serve(BA, AMD);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    fireEvent.click(screen.getByRole("button", { name: toggleName }));
    const lc = longCited();
    const card = document.getElementById(`passage-cite-${lc.cite}`) as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Expand full context" }));
    pick(AMD);
    await questionHeading(AMD);
    pick(BA);
    await questionHeading(BA);
    expect(screen.getByRole("button", { name: toggleName }).textContent).toMatch(/^Show /);
    const again = document.getElementById(`passage-cite-${lc.cite}`) as HTMLElement;
    expect(shown(again, "before")).not.toContain(lc.context.before);
  });
});

describe("claims tab long-tail collapse (phase 2)", () => {
  const panel = () => screen.getByRole("tabpanel");
  /** Cards on screen: jsdom has no CSS, so exclude the collapsed (`hidden`) wrapper by class. */
  const screenCards = () =>
    Array.from(panel().querySelectorAll("[data-claim-card]")).filter((c) => !c.closest("[data-collapsed-claims].hidden"));
  const openClaims = () => fireEvent.click(tab(/Claims/));
  const withUncited = (n: number): Trace => {
    const cited = BA.claims.filter((c) => c.cite !== null);
    const uncited = BA.claims.filter((c) => c.cite === null);
    const pool = Array.from({ length: n }, (_, i) => ({ ...uncited[i % uncited.length], entity: `Uncited ${i}` }));
    return { ...BA, claims: [...cited, ...pool] };
  };

  it('with more than 8 uncited claims, shows 5 and a "Show all N extracted claims" button', () => {
    const citedCount = NVDA.claims.filter((c) => c.cite !== null).length;
    expect(NVDA.claims).toHaveLength(60);
    expect(citedCount).toBe(3);
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    expect(screenCards()).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Show all 60 extracted claims" })).toBeTruthy();
  });

  it("clicking the button shows every claim and offers to show fewer; a second click collapses", () => {
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    fireEvent.click(screen.getByRole("button", { name: "Show all 60 extracted claims" }));
    expect(screenCards()).toHaveLength(60);
    fireEvent.click(screen.getByRole("button", { name: "Show fewer claims" }));
    expect(screenCards()).toHaveLength(8);
  });

  it("collapsed claims stay in the DOM behind a print-visible wrapper", () => {
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    expect(panel().querySelectorAll("[data-claim-card]")).toHaveLength(60);
    const wrapper = panel().querySelector("[data-collapsed-claims]") as HTMLElement;
    expect(wrapper.className).toMatch(/(^|\s)hidden(\s)/);
    expect(wrapper.className).toContain("print:block");
    expect(screen.getByRole("button", { name: /Show all 60/ }).className).toContain("print:hidden");
  });

  it("with exactly 8 uncited claims, all render and there is no button", () => {
    const trace = withUncited(8);
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    openClaims();
    expect(screenCards()).toHaveLength(trace.claims.length);
    expect(panel().querySelector("[data-collapsed-claims]")).toBeNull();
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("with 9 uncited claims it collapses", () => {
    const trace = withUncited(9);
    const citedCount = trace.claims.filter((c) => c.cite !== null).length;
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    openClaims();
    expect(screenCards()).toHaveLength(citedCount + 5);
  });

  it("cited claims render before uncited ones", () => {
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    const flags = Array.from(panel().querySelectorAll("[data-claim-card]")).map((c) => c.getAttribute("data-cited"));
    expect(flags.slice(0, 3)).toEqual(["true", "true", "true"]);
    expect(flags.slice(3).every((f) => f === "false")).toBe(true);
  });

  it("raw JSON toggles per claim even after reordering", () => {
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    const first = screenCards()[0] as HTMLElement;
    fireEvent.click(within(first).getByRole("button", { name: "View raw extraction JSON" }));
    expect(panel().querySelectorAll("pre")).toHaveLength(1);
    expect(first.querySelector("pre")).not.toBeNull();
  });

  it("the pill shows the claim-type bucket label and claim type", () => {
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    const card = screenCards()[0] as HTMLElement;
    const claim = NVDA.claims.filter((c) => c.cite !== null)[0];
    expect(card.textContent).toContain(` · ${claim.claim_type}`);
  });

  it("switching trace collapses the list again", async () => {
    serve(NVDA, AMD);
    render(<TraceViewer initialTrace={NVDA} manifest={MANIFEST} />);
    openClaims();
    fireEvent.click(screen.getByRole("button", { name: "Show all 60 extracted claims" }));
    pick(AMD);
    await questionHeading(AMD);
    pick(NVDA);
    await questionHeading(NVDA);
    openClaims();
    expect(screenCards()).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Show all 60 extracted claims" })).toBeTruthy();
  });
});

describe("audit note tab (phase 2)", () => {
  const noneCited = (md: string) => md.split("\n").filter((l) => /none cited/i.test(l)).length;
  const hiddenN = noneCited(BA.audit_note_md as string);
  const openAudit = () => fireEvent.click(tab(/Audit/));
  const screenNote = () => document.querySelector("[data-audit-note]:not(.hidden)") as HTMLElement;
  const toggleName = new RegExp(`${hiddenN} lines with no citations`);

  it("audit tab renders markdown headings, not a <pre>", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    openAudit();
    const panel = screen.getByRole("tabpanel");
    expect(panel.querySelector("pre")).toBeNull();
    expect(within(panel).getAllByRole("heading", { level: 1 }).length).toBeGreaterThan(0);
    expect(panel.textContent).not.toContain("[[");
  });

  it('hides "none cited" lines on screen behind a "Show N lines with no citations" toggle', () => {
    expect(hiddenN).toBeGreaterThan(0);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    openAudit();
    expect(screenNote().textContent).not.toMatch(/none cited/i);
    const btn = screen.getByRole("button", { name: toggleName });
    expect(btn.textContent).toMatch(/^Show /);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(screenNote().textContent?.match(/none cited/gi)).toHaveLength(hiddenN);
    const open = screen.getByRole("button", { name: toggleName });
    expect(open.textContent).toMatch(/^Hide /);
    expect(open.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the none-cited lines in the DOM behind a print-only wrapper while closed", () => {
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    openAudit();
    const printCopy = document.querySelector("[data-audit-note].hidden.print\\:block") as HTMLElement;
    expect(printCopy.textContent?.match(/none cited/gi)).toHaveLength(hiddenN);
    expect(screenNote().className).toContain("print:hidden");
  });

  it("a note with no none-cited lines shows no toggle", () => {
    const trace: Trace = { ...BA, audit_note_md: "# Note\n\n- [[A]]: [1]" };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    openAudit();
    expect(screen.queryByRole("button", { name: /lines with no citations/ })).toBeNull();
  });

  it("a note with no none-cited lines still prints: the on-screen note is not print:hidden and no print copy is added", () => {
    const trace: Trace = { ...BA, audit_note_md: "# Note\n\n- [[A]]: [1]" };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    openAudit();
    const notes = document.querySelectorAll("[data-audit-note]");
    expect(notes).toHaveLength(1);
    expect(notes[0].className).not.toContain("print:hidden");
    expect(notes[0].textContent).toContain("Note");
  });

  it("markdown links in the audit note follow the same host allowlist as the answer", () => {
    const trace: Trace = {
      ...BA,
      audit_note_md:
        "# N\n\n[ok](https://www.sec.gov/x) [js](javascript:alert(1)) [evil](https://evil.example/x) [gh](https://github.com/a/b)",
    };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    openAudit();
    const panel = within(screen.getByRole("tabpanel"));
    expect(panel.getByRole("link", { name: "ok" }).getAttribute("href")).toBe("https://www.sec.gov/x");
    expect(panel.getByRole("link", { name: "gh" }).getAttribute("href")).toBe("https://github.com/a/b");
    expect(panel.queryByRole("link", { name: "js" })).toBeNull();
    expect(panel.queryByRole("link", { name: "evil" })).toBeNull();
  });

  it("images render as nothing and raw HTML is not parsed", () => {
    const trace: Trace = {
      ...BA,
      audit_note_md: "# N\n\nBefore ![pixel](https://evil.example/p.png) <b id=\"raw\">bold</b> after.",
    };
    render(<TraceViewer initialTrace={trace} manifest={MANIFEST} />);
    openAudit();
    const panel = screen.getByRole("tabpanel");
    expect(panel.querySelector("img")).toBeNull();
    expect(panel.querySelector("#raw")).toBeNull();
    expect(panel.textContent).toContain("Before");
  });

  it("switching trace resets the none-cited toggle", async () => {
    serve(NVDA, BA);
    render(<TraceViewer initialTrace={BA} manifest={MANIFEST} />);
    openAudit();
    fireEvent.click(screen.getByRole("button", { name: toggleName }));
    pick(NVDA);
    await questionHeading(NVDA);
    pick(BA);
    await questionHeading(BA);
    openAudit();
    expect(screen.getByRole("button", { name: toggleName }).textContent).toMatch(/^Show /);
  });
});
