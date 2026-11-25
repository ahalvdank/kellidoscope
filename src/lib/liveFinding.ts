import type { Trace } from "../data/types";

/** The trace and phrase the home page quotes. The text itself is always read from the trace. */
export const LIVE_FINDING = {
  slug: "nvda-export-control-risk-fy22-fy26",
  needle: "$4.5 billion charge",
} as const;

export interface Finding {
  text: string;
  cites: number[];
  href: string;
}

// A sentence ends at . ! or ? (plus any closing quote or bracket) before whitespace and a capital.
const SENTENCE_BREAK = /(?<=[.!?]["”')\]]*)\s+(?=["“(]?[A-Z])/;
const CITE_MARKER = /\s*\[(\d+)\]/g;

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1");
}

/**
 * Pulls one finding out of a trace's answer: the sentence containing `needle`, plus up to
 * `extraSentences` sentences after it, with markdown and [n] cite markers removed.
 * @param trace the trace whose answer_md is searched
 * @param needle text the sentence must contain
 * @param extraSentences how many following sentences to include
 * @returns the clean text, the cite numbers it carried, and the link to the full trace
 * @throws Error when no sentence contains the needle
 */
export function extractFinding(trace: Trace, needle: string, extraSentences = 0): Finding {
  const sentences = trace.answer_md
    .split(/\n{2,}/)
    .flatMap((paragraph) => paragraph.split(SENTENCE_BREAK))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const start = sentences.findIndex((sentence) => sentence.includes(needle));
  if (start === -1) throw new Error(`Live Finding: needle not found in ${trace.slug}`);

  const raw = sentences.slice(start, start + 1 + extraSentences).join(" ");
  const cites = [...raw.matchAll(CITE_MARKER)].map((match) => Number(match[1]));
  return {
    text: stripMarkdown(raw.replace(CITE_MARKER, "")),
    cites,
    href: `/demos/10k-kb/q/${trace.slug}/`,
  };
}
