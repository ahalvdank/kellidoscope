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
    expect(prose.className).toContain("prose");
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
