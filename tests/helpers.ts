import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Pipeline exports dir; override with FILINGS_KB_EXPORTS. */
export const EXPORTS_DIR =
  process.env.FILINGS_KB_EXPORTS ?? join(homedir(), "Code", "filings-kb", "exports");
export const SCHEMAS_DIR = join(EXPORTS_DIR, "..", "schemas");
export const HAVE_EXPORTS = existsSync(join(EXPORTS_DIR, "manifest.json"));
