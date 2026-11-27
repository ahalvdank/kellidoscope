/** Click events counted in GoatCounter. Each is recorded as an event whose path is the name. */
export type CountedEvent = "citation" | "sec-link" | "repo" | "resume" | "demo-class";

interface GoatCounterCountVars {
  path: string;
  event?: boolean;
}

declare global {
  interface Window {
    /** Set by GoatCounter's count.js; absent when blocked or not yet loaded. */
    goatcounter?: { count?: (vars: GoatCounterCountVars) => void };
  }
}

function count(vars: GoatCounterCountVars): void {
  if (typeof window === "undefined") return;
  const counter = window.goatcounter;
  if (typeof counter?.count !== "function") return;
  counter.count(vars);
}

/** Records a pageview for a client-side navigation (count.js records the landing page itself). */
export function countPageview(path: string): void {
  count({ path });
}

/** Records a click event for elements count.js cannot bind (anything rendered by an island). */
export function countEvent(name: CountedEvent): void {
  count({ path: name, event: true });
}
