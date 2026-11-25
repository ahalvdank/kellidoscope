import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

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
