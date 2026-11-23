#!/usr/bin/env node
// Post-build guard: runs the banned-copy rules over the visible text of every built page, so copy
// that reaches dist/ from anywhere (components, frontmatter, data) is checked, not just source files.
// Trace pages under demos/ are skipped: they quote SEC filings, which may use any word.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { copyViolations } from "./copy-rules.mjs";

/** Pages that describe the 10-K KB or the portfolio manager, where "production" is banned. */
export const PRODUCTION_BANNED_PAGES = ["index.html", "projects/10k-kb/index.html", "projects/portfolio-manager/index.html"];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Text a visitor or a search engine can see: the title, the meta description, aria-labels and
 * every text node outside <script> and <style>, with whitespace collapsed.
 * @param {string} html one built page
 * @returns {string}
 */
export function visibleText(html) {
  const meta = [...html.matchAll(/<meta\s[^>]*name="description"[^>]*content="([^"]*)"/gi)].map((m) => m[1]);
  const aria = [...html.matchAll(/aria-label="([^"]*)"/gi)].map((m) => m[1]);
  const body = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities([...meta, ...aria, body].join(" ")).replace(/\s+/g, " ").trim();
}

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield full;
  }
}

/**
 * @param {string} distDir built site; throws if it is not a directory
 * @returns {string[]} sorted "page:rule" entries; [] when clean
 */
export function checkRenderedCopy(distDir) {
  if (!statSync(distDir).isDirectory()) throw new Error(`${distDir} is not a directory`);
  const offenders = [];
  for (const file of htmlFiles(distDir)) {
    const rel = relative(distDir, file).split(sep).join("/");
    if (rel.startsWith("demos/")) continue;
    const text = visibleText(readFileSync(file, "utf8"));
    const production = PRODUCTION_BANNED_PAGES.includes(rel);
    for (const rule of copyViolations(text, { rendered: true, production })) offenders.push(`${rel}:${rule}`);
  }
  return offenders.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = process.argv[2] ?? "dist";
  const offenders = checkRenderedCopy(distDir);
  if (offenders.length > 0) {
    console.error(`Rendered copy check FAILED: ${offenders.length} violations in ${distDir}/`);
    for (const entry of offenders) console.error(`  ${entry}`);
    process.exit(1);
  }
  console.log(`Rendered copy check passed: visible text of ${distDir}/ pages follows the copy rules.`);
}
