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
  systemClipUrl: null,
};
