const NONE_CITED = /none cited/i;
const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

/**
 * Prepares an export's `audit_note_md` for display.
 * Lines matching /none cited/i are dropped unless `showUncited`; `hiddenCount` is always the
 * number of such lines so the caller can label its toggle. `[[target|label]]` becomes `label`
 * and `[[target]]` becomes `target`: plain text, never a link.
 */
export function prepareAuditNote(md: string, showUncited: boolean): { md: string; hiddenCount: number } {
  const lines = md.split("\n");
  const hiddenCount = lines.filter((l) => NONE_CITED.test(l)).length;
  const kept = showUncited ? lines : lines.filter((l) => !NONE_CITED.test(l));
  const text = kept.join("\n").replace(WIKI_LINK, (_m, target: string, label?: string) => label ?? target);
  return { md: text, hiddenCount };
}
