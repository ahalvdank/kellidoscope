/**
 * Returns `url` unchanged when it is an https URL, has no embedded credentials and its hostname
 * is exactly one of `allowedHosts`; otherwise null. Callers render plain text for null.
 */
export function safeUrl(url: string, allowedHosts: readonly string[]): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null; // relative, empty or unparseable
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username !== "" || parsed.password !== "") return null;
  if (!allowedHosts.includes(parsed.hostname)) return null;
  return url;
}
