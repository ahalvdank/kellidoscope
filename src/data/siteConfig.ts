export interface SiteConfig {
  linkedin: string;
  resumePath: string;
  github: string;
  goatcounter: string;
  filingsKbRepo: string;
  blindTastingRepo: string;
  blindTastingApp: string;
  cellarApp: string;
  /** URL of the class-tasting app's public page; the card links here. */
  classTastingApp: string;
  /** URL of the class-tasting app's demo class; the card's "Try the demo class" link goes here. */
  classTastingDemo: string;
  /** Site path of the blind-tasting game screenshot; null until it exists, which hides the card image. */
  blindTastingPreview: string | null;
  /** Site path of the wine journal screenshot; null until it exists, which hides the card image. */
  cellarPreview: string | null;
  /** Site path of the class-tasting screenshot; null until it exists, which hides the card image. */
  classTastingPreview: string | null;
  /** Site path of the blind-tasting screen recording; null until it exists, which hides the card's clip disclosure. */
  blindTastingClip: string | null;
  /** Poster frame for the blind-tasting clip; null when the clip has none. */
  blindTastingClipPoster: string | null;
  /** Site path of the wine journal demo-collection recording; null until it exists, which hides the card's clip disclosure. */
  cellarClip: string | null;
  /** Poster frame for the wine journal clip; null when the clip has none. */
  cellarClipPoster: string | null;
  /** Site path of the staged class-tasting recording (local stack, invented class); null until it exists, which hides the card's clip disclosure. */
  classTastingClip: string | null;
  /** Poster frame for the class-tasting clip; null when the clip has none. */
  classTastingClipPoster: string | null;
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
  classTastingDemo: "https://class-tasting.kellidoscope.com/demo",
  blindTastingPreview: "/media/blind-tasting-thumb.jpg",
  cellarPreview: "/media/wine-journal-thumb.jpg",
  classTastingPreview: "/media/class-tasting-thumb.jpg",
  blindTastingClip: "/media/blind-tasting-clip.mp4",
  blindTastingClipPoster: "/media/blind-tasting-clip-poster.jpg",
  cellarClip: "/media/wine-journal-clip.mp4",
  cellarClipPoster: "/media/wine-journal-clip-poster.jpg",
  classTastingClip: "/media/class-tasting-clip.mp4",
  classTastingClipPoster: "/media/class-tasting-clip-poster.jpg",
  systemClipUrl: "/media/kb-explorer-clip.mp4",
  systemClipPoster: "/media/kb-explorer-poster.jpg",
  portfolioClipUrl: null,
  portfolioClipPoster: null,
};
