export interface SiteConfig {
  linkedin: string;
  resumePath: string;
  github: string;
  goatcounter: string;
  filingsKbRepo: string;
  blindTastingRepo: string;
  blindTastingApp: string;
  cellarApp: string;
  /** URL of the 10-K explorer screen recording; null until it exists, which hides the clip slot. */
  systemClipUrl: string | null;
  /** Poster frame shown before the clip plays; null when the clip has none. */
  systemClipPoster: string | null;
  /** URL of the portfolio manager screen recording; null until it exists, which hides the clip slot. */
  portfolioClipUrl: string | null;
  /** Poster frame shown before the portfolio clip plays; null when the clip has none. */
  portfolioClipPoster: string | null;
}

export const siteConfig: SiteConfig = {
  linkedin: "https://www.linkedin.com/in/andrewhkell",
  resumePath: "/andrew-kell-resume.pdf",
  github: "https://github.com/ahalvdank",
  goatcounter: "https://kellidoscope.goatcounter.com",
  filingsKbRepo: "https://github.com/ahalvdank/filings-kb",
  blindTastingRepo: "https://github.com/ahalvdank/blind-tasting-public",
  blindTastingApp: "https://blindtaste.kellidoscope.com",
  cellarApp: "https://cellar.kellidoscope.com",
  systemClipUrl: "/media/kb-explorer-clip.mp4",
  systemClipPoster: "/media/kb-explorer-poster.jpg",
  portfolioClipUrl: null,
  portfolioClipPoster: null,
};
