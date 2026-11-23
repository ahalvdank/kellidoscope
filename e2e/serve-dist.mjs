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
  ".mp4": "video/mp4",
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
  const type = MIME[extname(file)] ?? "application/octet-stream";
  const body = readFileSync(file);
  // Like Vercel, honor a single byte range: WebKit will not play a video from a server without it.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(body.length - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    if (start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${body.length}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${body.length}`,
      "Content-Length": end - start + 1,
    });
    res.end(body.subarray(start, end + 1));
    return;
  }
  res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes" });
  res.end(body);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`serving dist/ with vercel.json headers on http://127.0.0.1:${PORT}`);
});
