export interface SiteConfig {
  linkedin: string;
  resumePath: string;
  github: string;
  goatcounter: string;
  filingsKbRepo: string;
  blindTastingRepo: string;
  blindTastingApp: string;
  cellarApp: string;
  classTastingApp: string;
  /** Site path of the blind-tasting game screenshot; null until it exists, which hides the card image. */
  blindTastingPreview: string | null;
  /** Site path of the wine journal screenshot; null until it exists, which hides the card image. */
  cellarPreview: string | null;
  /** Site path of the class-tasting screenshot; null until it exists, which hides the card image. */
  classTastingPreview: string | null;
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
  classTastingApp: "https://class-tasting.kellidoscope.com",
  blindTastingPreview: null,
  cellarPreview: null,
  classTastingPreview: null,
  systemClipUrl: "/media/kb-explorer-clip.mp4",
  systemClipPoster: "/media/kb-explorer-poster.jpg",
  portfolioClipUrl: null,
  portfolioClipPoster: null,
};
