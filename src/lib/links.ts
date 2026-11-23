import { siteConfig, type SiteConfig } from "../data/siteConfig";

/**
 * Resolves a copy link: a site path ("/projects/10k-kb") stays as it is, anything else must be a
 * siteConfig key, so every external URL on the site comes from one verified place.
 * @throws Error when the value is neither a site path nor a siteConfig key.
 */
export function resolveHref(href: string, config: SiteConfig = siteConfig): string {
  if (href.startsWith("/")) return href;
  if (!Object.prototype.hasOwnProperty.call(config, href)) {
    throw new Error(`Copy link "${href}" is neither a site path nor a siteConfig key`);
  }
  const url = config[href as keyof SiteConfig];
  if (url === null) throw new Error(`Copy link "${href}" points at siteConfig.${href}, which is not set yet`);
  return url;
}

/** True for links that leave the site, which open in a new tab. */
export const isExternal = (href: string): boolean => /^https?:\/\//.test(href);
