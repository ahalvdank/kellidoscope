import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { siteConfig, type SiteConfig } from "../data/siteConfig";

/**
 * True when a site path such as "/media/x.jpg" names a file under public/.
 * Null, empty and ".." paths are false, so a missing thumbnail never renders a broken image.
 */
export function publicAssetExists(
  path: string | null | undefined,
  publicDir: string = join(process.cwd(), "public"),
): boolean {
  if (!path || path.includes("..")) return false;
  const file = join(publicDir, path);
  return existsSync(file) && statSync(file).isFile();
}

/**
 * Build-time guard for configured media: a null path is fine (the slot is hidden), but a set path
 * must name a real file under public/, so a typo fails the build instead of shipping a broken image.
 * @throws Error("Missing media file: <path>") when a non-null path does not exist.
 */
export function assertPublicAsset(path: string | null, publicDir?: string): void {
  if (path !== null && !publicAssetExists(path, publicDir)) {
    throw new Error(`Missing media file: ${path}`);
  }
}

/** Checks several configured media paths in one call; see assertPublicAsset. */
export function assertPublicAssets(...paths: (string | null)[]): void {
  for (const path of paths) assertPublicAsset(path);
}

/**
 * Resolves a card's `preview` key to its siteConfig screenshot path (null while none exists).
 * @throws Error when the key is not a siteConfig `*Preview` key, so a typo fails the build.
 */
export function resolvePreview(key: string, config: SiteConfig = siteConfig): string | null {
  if (!key.endsWith("Preview") || !Object.prototype.hasOwnProperty.call(config, key)) {
    throw new Error(`Card preview "${key}" is not a siteConfig *Preview key`);
  }
  return config[key as keyof SiteConfig];
}
