#!/usr/bin/env node
// Minimal static server for dist/ that applies vercel.json's headers exactly as written, so the
// e2e tests see the production Content-Security-Policy. `astro preview` would not send them.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = resolve(ROOT, "dist");
const PORT = Number(process.env.PORT ?? 4399);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

/**
 * Compiles vercel.json header rules. Only regex-style sources such as "/(.*)" are supported;
 * a path-to-regexp named parameter (":slug") throws rather than being misapplied.
 */
function loadHeaderRules() {
  const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  return (config.headers ?? []).map(({ source, headers }) => {
    if (source.includes(":")) throw new Error(`unsupported vercel.json header source: ${source}`);
    return { pattern: new RegExp(`^${source}$`), headers };
  });
}

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const target = resolve(DIST, `.${decoded}`);
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  if (existsSync(target) && statSync(target).isDirectory()) {
    const index = join(target, "index.html");
    return existsSync(index) ? index : null;
  }
  return existsSync(target) ? target : null;
}

if (!existsSync(DIST)) {
  console.error("dist/ not found; run `npm run build` first.");
  process.exit(1);
}
const rules = loadHeaderRules();

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  for (const rule of rules) {
    if (!rule.pattern.test(pathname)) continue;
    for (const { key, value } of rule.headers) res.setHeader(key, value);
  }
  const file = resolveFile(pathname);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`serving dist/ with vercel.json headers on http://127.0.0.1:${PORT}`);
});
