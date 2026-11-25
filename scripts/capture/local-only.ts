// No Playwright import here, so the unit tests can load it.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * True when a request stays on this machine: a local dev server or local backend (localhost or
 * 127.0.0.1), or an in-page data:/blob: URL whose origin is local. A local-only capture refuses
 * everything else, so it can never reach a hosted project.
 */
export function isLocalUrl(url: string): boolean {
  if (url.startsWith("data:")) return true;
  const inner = url.startsWith("blob:") ? url.slice("blob:".length) : url;
  try {
    return LOCAL_HOSTS.has(new URL(inner).hostname);
  } catch {
    return false;
  }
}
