#!/usr/bin/env node
// Copy featured Query Traces from the filings-kb export into the site.
//   node scripts/sync-traces.mjs <SRC>   SRC = filings-kb/exports (manifest.json + traces/*.json)
//   node scripts/sync-traces.mjs         dev only: restore the _DEV_ fixture into src/data/traces
// Destinations: src/data/traces (build-time) and public/data/traces (runtime fetch).
// Only traces whose manifest entry has `featured: true` are copied, and the copied manifest
// is filtered to the same set. `_DEV_*` files are never copied from SRC.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const DEV_FIXTURE = "_DEV_FIXTURE_do_not_ship.json";
const BUILD_DIR = "src/data/traces";
const PUBLIC_DIR = "public/data/traces";

/** Delete previously synced JSON from `dir`, keeping `_DEV_` fixtures. */
function clearSynced(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".json") && !name.startsWith("_DEV_")) rmSync(join(dir, name));
  }
}

/**
 * @param {{src?: string, root?: string}} opts `root` is the repo root (tests pass a temp dir).
 * @returns {{copied: string[], skipped: string[]}} slugs copied, and slugs skipped as not featured.
 * @throws if the manifest is missing, nothing is featured, or a featured trace file is missing.
 *   All inputs are validated before any destination is touched.
 */
export function syncTraces({ src, root = REPO_ROOT } = {}) {
  const buildDir = join(root, BUILD_DIR);

  if (!src) {
    mkdirSync(buildDir, { recursive: true });
    copyFileSync(join(SCRIPT_DIR, "fixtures", DEV_FIXTURE), join(buildDir, DEV_FIXTURE));
    return { copied: [], skipped: [] };
  }

  const manifestPath = join(src, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`manifest.json not found in ${src}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const isShippable = (t) => t.featured === true && !t.slug.startsWith("_DEV_");
  const featured = manifest.traces.filter(isShippable);
  const skipped = manifest.traces.filter((t) => !isShippable(t)).map((t) => t.slug);
  if (featured.length === 0) throw new Error(`No featured traces in ${manifestPath}`);

  const sources = featured.map((t) => {
    const file = join(src, "traces", `${t.slug}.json`);
    if (!existsSync(file)) throw new Error(`Featured trace "${t.slug}" has no file at ${file}`);
    return { slug: t.slug, file };
  });

  const filtered = JSON.stringify({ ...manifest, traces: featured }, null, 2) + "\n";
  for (const dest of [buildDir, join(root, PUBLIC_DIR)]) {
    mkdirSync(dest, { recursive: true });
    clearSynced(dest);
    for (const { slug, file } of sources) copyFileSync(file, join(dest, `${slug}.json`));
    writeFileSync(join(dest, "manifest.json"), filtered);
  }
  return { copied: sources.map((s) => s.slug), skipped };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = process.argv[2] ? resolve(process.argv[2]) : undefined;
  const { copied, skipped } = syncTraces({ src });
  if (src) {
    console.log(`Synced ${copied.length} featured traces from ${src}; skipped ${skipped.length} not featured.`);
  } else {
    console.log(`No SRC given: restored ${DEV_FIXTURE} into ${BUILD_DIR}.`);
  }
}
