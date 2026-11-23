// Banned-copy rules shared by tests/copy-rules.test.ts (source files) and
// scripts/check-rendered-copy.mjs (visible text of the built pages).

export const PJ4_AGENTS = "AI coding agents worked like my staff engineers and wrote most of the code";
export const PJ4_FULL = `I was the architect, product manager and engineering team lead; ${PJ4_AGENTS}`;

/** Rules for every copy file and every rendered page. Each returns true when the text violates it. */
const GLOBAL_RULES = [
  // Only the PJ4 agents clause may say "wrote"; Andrew never wrote or coded anything himself.
  ["wrote-or-coded", (t) => /\bwrote\b|\bcoded\b/i.test(t.split(PJ4_AGENTS).join(""))],
  [
    "team-lead-outside-pj4",
    (t) => (t.match(/engineering team lead/gi) ?? []).length !== t.split(PJ4_FULL).length - 1,
  ],
  // PJ4: the staff-engineer comparison is a metaphor; never imply he managed human engineers.
  ["my-team", (t) => /\bmy team\b|managed (a |my )?team/i.test(t)],
  ["vendor-or-deal-figure", (t) => /PitchBook|Mintel|IBISWorld|Euromonitor|\$4M|\$50M|8 deals|6 closed|SPV/.test(t)],
  ["partner-permission", (t) => /partner permission/i.test(t)],
  ["needs-fact", (t) => t.includes("[NEEDS FACT")],
  ["clean-room", (t) => /clean[- ]?room/i.test(t)],
  ["parity", (t) => /parity|matched[- ]claim recall/i.test(t)],
  ["parity-recall-figure", (t) => /\b(87\.3|97\.1|77\.8|79\.5|86\.4|84\.8|95\.9|73\.6|84\.1)%/.test(t)],
];

/** Rules for copy that reaches the site (not the internal content/ planning files). */
const RENDERED_RULES = [
  ["stale-8-company-sample", (t) => /8[- ]compan|16[- ]filing|16 10-Ks/i.test(t)],
  ["blind-tasting-repo-stats", (t) => /68 test files/i.test(t)],
];

/** "production" is banned for the 10-K KB and the portfolio manager (Beckett may use it). */
const PRODUCTION_RULE = ["production", (t) => /production/i.test(t)];

/**
 * Ids of the rules a text breaks.
 * @param {string} text copy to check
 * @param {{ rendered?: boolean, production?: boolean }} [opts] rendered: also apply the
 *   site-copy rules; production: also ban the word "production"
 * @returns {string[]} violated rule ids, [] when clean
 */
export function copyViolations(text, { rendered = false, production = false } = {}) {
  const rules = [...GLOBAL_RULES, ...(rendered ? RENDERED_RULES : []), ...(production ? [PRODUCTION_RULE] : [])];
  return rules.filter(([, broken]) => broken(text)).map(([id]) => id);
}
