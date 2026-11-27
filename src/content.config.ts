import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Page copy lives in content/*.md so tests/copy-rules.test.ts can check every public sentence.
const link = z.object({
  label: z.string(),
  // A site path ("/projects/10k-kb") or a key of siteConfig ("blindTastingRepo").
  href: z.string(),
  event: z.enum(["repo", "demo-class"]).optional(),
});

const card = z.object({
  name: z.string(),
  summary: z.string(),
  // One short proof line shown at the top of the card.
  metric: z.string().optional(),
  // Site path under public/; the card shows no image when it is unset or the file is missing.
  thumbnail: z.string().nullable().optional(),
  thumbnailAlt: z.string().optional(),
  // A siteConfig "*Preview" key naming the card's screenshot, with its alt text.
  preview: z.string().optional(),
  previewAlt: z.string().optional(),
  // A siteConfig "*Clip" key naming the card's screen recording, with its caption.
  clip: z.string().optional(),
  clipCaption: z.string().optional(),
  status: z.string().optional(),
  links: z.array(link).min(1),
});

const copy = defineCollection({
  loader: glob({ pattern: ["copy-*.md", "architecture-matrix.md"], base: "./content" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    disclaimer: z.string().optional(),
    hero: z.object({ headline: z.string(), subhead: z.string(), cta: link.pick({ label: true, href: true }) }).optional(),
    flagships: z.array(card).optional(),
    personal: z.object({ heading: z.string(), role: z.string(), cards: z.array(card) }).optional(),
  }),
});

export const collections = { copy };
