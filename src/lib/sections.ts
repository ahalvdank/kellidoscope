/**
 * Splits rendered Markdown HTML at its `<h2 id="...">` headings so a page can place components
 * (diagrams, the evals ledger, the trace teaser) between copy sections.
 *
 * Content before the first h2 is the section "intro". Each other section keeps its own h2.
 */
export interface SectionReader {
  /** HTML of one section; throws when the copy has no such section. */
  get(id: string): string;
  /** Throws when a section was never read, so no copy is silently dropped from a page. */
  assertAllUsed(): void;
}

const H2_START = /<h2\b[^>]*\bid="([^"]+)"[^>]*>/g;

export function splitSections(html: string, source: string): SectionReader {
  const sections = new Map<string, string>();
  const starts = Array.from(html.matchAll(H2_START));

  const intro = html.slice(0, starts[0]?.index ?? html.length).trim();
  if (intro) sections.set("intro", intro);

  starts.forEach((match, i) => {
    const id = match[1];
    if (sections.has(id)) throw new Error(`${source}: duplicate section "${id}"`);
    const end = starts[i + 1]?.index ?? html.length;
    sections.set(id, html.slice(match.index, end).trim());
  });

  const used = new Set<string>();
  return {
    get(id) {
      const section = sections.get(id);
      if (section === undefined) {
        throw new Error(`${source}: no section "${id}" (have: ${[...sections.keys()].join(", ")})`);
      }
      used.add(id);
      return section;
    },
    assertAllUsed() {
      const unused = [...sections.keys()].filter((id) => !used.has(id));
      if (unused.length > 0) throw new Error(`${source}: sections not placed on the page: ${unused.join(", ")}`);
    },
  };
}
