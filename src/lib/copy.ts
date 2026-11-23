import { getEntry } from "astro:content";
import { splitSections, type SectionReader } from "./sections";

/**
 * Loads one copy file from content/ with its frontmatter and its body split into h2 sections.
 * @throws Error when the file is missing from the copy collection.
 */
export async function loadCopy(id: string) {
  const entry = await getEntry("copy", id);
  if (!entry) throw new Error(`content/${id}.md is not in the copy collection`);
  const sections: SectionReader = splitSections(entry.rendered?.html ?? "", `content/${id}.md`);
  return { data: entry.data, sections };
}
