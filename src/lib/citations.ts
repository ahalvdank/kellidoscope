const CITE = /\[(\d+)\](?!\()/g;
// A code span opens with a run of N backticks and closes at the next run of exactly N.
const INLINE_CODE = /((?<!`)(`+)(?!`)[\s\S]*?(?<!`)\2(?!`))/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;

function linkOutsideInlineCode(text: string, validCites: Set<number>): string {
  // split() with one capture group per alternation keeps code spans at odd indices; the
  // regex has two groups (outer + backtick run), so step through in threes.
  const parts = text.split(INLINE_CODE);
  let out = "";
  for (let i = 0; i < parts.length; i += 3) {
    out += parts[i].replace(CITE, (match, n: string) =>
      validCites.has(Number(n)) ? `[[${n}]](#cite-${n})` : match,
    );
    if (i + 1 < parts.length) out += parts[i + 1];
  }
  return out;
}

/**
 * Turns `[n]` into a markdown link `[[n]](#cite-n)` only when n is in `validCites`, the marker
 * is not already a link label (`[2025](https://…)`), and it is not inside a code span or fence.
 */
export function linkCitations(md: string, validCites: Set<number>): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let prose: string[] = [];
  let fence: { char: string; length: number } | null = null;

  const flushProse = () => {
    if (prose.length === 0) return;
    out.push(linkOutsideInlineCode(prose.join("\n"), validCites));
    prose = [];
  };

  for (const line of lines) {
    if (fence) {
      out.push(line);
      const close = new RegExp(`^ {0,3}${fence.char}{${fence.length},}[ \\t]*$`);
      if (close.test(line)) fence = null;
      continue;
    }
    const open = FENCE_OPEN.exec(line);
    if (open) {
      flushProse();
      out.push(line);
      fence = { char: open[1][0], length: open[1].length };
      continue;
    }
    prose.push(line);
  }
  flushProse();
  return out.join("\n");
}
