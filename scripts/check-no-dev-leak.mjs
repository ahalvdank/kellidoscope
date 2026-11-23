#!/usr/bin/env node
// Post-build guard: fail if dev fixtures or unfinished copy markers reach dist/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const LEAK_PATTERNS = ["_DEV_", "Lorem Corp", "TODO", "[NEEDS FACT", "XXXX"];

const TEXT_EXTENSIONS = new Set([
  ".html", ".htm", ".js", ".mjs", ".css", ".json", ".txt", ".xml", ".svg", ".md", ".map", ".webmanifest",
]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/**
 * Scan a built site for leaked dev content.
 * @param {string} distDir directory to scan; throws if it does not exist.
 * @returns {string[]} sorted "relative/path:pattern" entries; [] when clean.
 *   A file whose name contains "_DEV_" is reported as "path:_DEV_ (filename)".
 */
export function checkNoDevLeak(distDir) {
  if (!statSync(distDir).isDirectory()) {
    throw new Error(`${distDir} is not a directory`);
  }
  const offenders = [];
  for (const file of walk(distDir)) {
    const rel = relative(distDir, file).split(sep).join("/");
    if (rel.split("/").pop().includes("_DEV_")) {
      offenders.push(`${rel}:_DEV_ (filename)`);
    }
    if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase())) continue;
    const text = readFileSync(file, "utf8");
    for (const pattern of LEAK_PATTERNS) {
      if (text.includes(pattern)) offenders.push(`${rel}:${pattern}`);
    }
  }
  return offenders.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = process.argv[2] ?? "dist";
  const offenders = checkNoDevLeak(distDir);
  if (offenders.length > 0) {
    console.error(`Leak check FAILED: ${offenders.length} offending entries in ${distDir}/`);
    for (const entry of offenders) console.error(`  ${entry}`);
    process.exit(1);
  }
  console.log(`Leak check passed: ${distDir}/ is clean.`);
}
