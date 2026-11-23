export type AnalyticsEvent =
  | "demo_opened"
  | "trace_selected"
  | "citation_clicked"
  | "sec_link_clicked"
  | "repo_clicked"
  | "resume_clicked";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number>
): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible === "function") {
    window.plausible(event, props ? { props } : undefined);
  }
}
