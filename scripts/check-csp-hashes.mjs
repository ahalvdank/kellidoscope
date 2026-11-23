#!/usr/bin/env node
// Post-build guard: every inline <script> in dist/ must be allowed by a sha256 hash in the
// Content-Security-Policy script-src that vercel.json serves. Astro inlines its island bootstrap,
// so without the hashes the TraceViewer never hydrates in production.
//
// The hashes are committed in vercel.json (Vercel reads it when the deploy starts, so the build
// must not rewrite it). After an Astro upgrade changes the bootstrap, regenerate them with:
//   npx astro build && node scripts/check-csp-hashes.mjs dist --update
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CSP_KEY = "content-security-policy";
const FORBIDDEN_SCRIPT_KEYWORDS = ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'"];
/** Script types a browser executes; anything else (ld+json, json, templates) is data. */
const EXECUTABLE_TYPES = new Set(["", "module", "text/javascript", "application/javascript"]);
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const EVENT_HANDLER_RE = /<[a-z][^>]*?\s(on[a-z]+)\s*=/gi;
const HASH_RE = /^'sha256-[A-Za-z0-9+/]+=*'$/;

function* walkHtml(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield full;
  }
}

function isExecutableInline(attrs) {
  if (/\ssrc\s*=/i.test(` ${attrs}`)) return false;
  const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1] ?? "";
  return EXECUTABLE_TYPES.has(type.toLowerCase());
}

/**
 * Scans built HTML for inline scripts and inline event handlers.
 * @param {string} distDir built site; throws if it does not exist.
 * @returns {{ hashes: Map<string, string[]>, handlers: string[] }} CSP hash source -> files using it,
 *   and "inline event handler <attr> (<file>)" problems.
 */
function scanDist(distDir) {
  if (!statSync(distDir).isDirectory()) throw new Error(`${distDir} is not a directory`);
  const hashes = new Map();
  const handlers = [];
  for (const file of walkHtml(distDir)) {
    const rel = relative(distDir, file).split(sep).join("/");
    const html = readFileSync(file, "utf8");
    for (const [, attrs, body] of html.matchAll(SCRIPT_RE)) {
      if (!isExecutableInline(attrs)) continue;
      const source = `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
      hashes.set(source, [...(hashes.get(source) ?? []), rel]);
    }
    const withoutScripts = html.replace(SCRIPT_RE, "");
    for (const [, attr] of withoutScripts.matchAll(EVENT_HANDLER_RE)) {
      handlers.push(`inline event handler ${attr.toLowerCase()} (${rel})`);
    }
  }
  return { hashes, handlers };
}

/** Finds the CSP header object in vercel.json; throws unless exactly one has a script-src. */
function findCspHeader(config) {
  const found = (config.headers ?? [])
    .flatMap((rule) => rule.headers ?? [])
    .filter((h) => h.key.toLowerCase() === CSP_KEY && /(^|;)\s*script-src\s/.test(h.value));
  if (found.length !== 1) {
    throw new Error(`expected exactly one Content-Security-Policy header with script-src, found ${found.length}`);
  }
  return found[0];
}

function scriptSrcSources(cspValue) {
  const directive = cspValue
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src "));
  return directive.split(/\s+/).slice(1);
}

/**
 * Compares dist/ inline scripts against vercel.json's script-src.
 * @param {string} distDir built site directory.
 * @param {string} vercelPath path to vercel.json.
 * @returns {string[]} problems, [] when the policy allows exactly the inline scripts present:
 *   "missing <hash> (<first file>)", "stale <hash>", "forbidden <keyword> in script-src",
 *   "inline event handler <attr> (<file>)".
 * @throws if distDir is missing or vercel.json has no single CSP script-src.
 */
export function checkCspHashes(distDir, vercelPath) {
  const sources = scriptSrcSources(findCspHeader(JSON.parse(readFileSync(vercelPath, "utf8"))).value);
  const { hashes, handlers } = scanDist(distDir);
  const problems = [];
  for (const keyword of FORBIDDEN_SCRIPT_KEYWORDS) {
    if (sources.includes(keyword)) problems.push(`forbidden ${keyword} in script-src`);
  }
  for (const [hash, files] of [...hashes].sort(([a], [b]) => a.localeCompare(b))) {
    if (!sources.includes(hash)) problems.push(`missing ${hash} (${files[0]})`);
  }
  for (const source of sources) {
    if (HASH_RE.test(source) && !hashes.has(source)) problems.push(`stale ${source}`);
  }
  return [...problems, ...handlers];
}

/**
 * Rewrites vercel.json's script-src hashes to exactly the inline scripts in distDir, keeping
 * every non-hash source and every other header. For manual use after an Astro upgrade.
 */
export function updateCspHashes(distDir, vercelPath) {
  const raw = readFileSync(vercelPath, "utf8");
  const oldValue = findCspHeader(JSON.parse(raw)).value;
  const { hashes } = scanDist(distDir);
  const kept = scriptSrcSources(oldValue).filter((s) => !HASH_RE.test(s));
  const directive = ["script-src", ...kept, ...[...hashes.keys()].sort()].join(" ");
  const newValue = oldValue
    .split(";")
    .map((d) => (d.trim().startsWith("script-src ") ? ` ${directive}` : d))
    .join(";")
    .trim();
  // Replace the JSON-encoded value in place so the rest of the file keeps its formatting.
  const encodedOld = JSON.stringify(oldValue);
  if (raw.split(encodedOld).length !== 2) {
    throw new Error("could not locate the CSP value in vercel.json exactly once");
  }
  writeFileSync(vercelPath, raw.replace(encodedOld, () => JSON.stringify(newValue)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const distDir = args.find((a) => !a.startsWith("--")) ?? "dist";
  const vercelPath = fileURLToPath(new URL("../vercel.json", import.meta.url));
  if (args.includes("--update")) {
    updateCspHashes(distDir, vercelPath);
    console.log(`Updated script-src hashes in ${vercelPath}; review and commit the diff.`);
  }
  const problems = checkCspHashes(distDir, vercelPath);
  if (problems.length > 0) {
    console.error(`CSP hash check FAILED for ${distDir}/ against vercel.json:`);
    for (const p of problems) console.error(`  ${p}`);
    console.error("If the inline scripts changed on purpose, run: node scripts/check-csp-hashes.mjs dist --update");
    process.exit(1);
  }
  console.log(`CSP hash check passed: every inline script in ${distDir}/ is allowed by a committed hash.`);
}
