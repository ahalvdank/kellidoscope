import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import manifestSchema from "./schemas/manifest.schema.json";
import traceSchema from "./schemas/trace.schema.json";

// The schemas use `format: "date"`; the adjacent `pattern` already enforces the shape.
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
const checkTrace = ajv.compile(traceSchema);
const checkManifest = ajv.compile(manifestSchema);

function describe(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => {
    const extra = e.keyword === "additionalProperties" ? ` (${e.params.additionalProperty})` : "";
    const missing = e.keyword === "required" ? ` (${e.params.missingProperty})` : "";
    return `${e.instancePath || "/"} ${e.message}${extra}${missing}`;
  });
}

/** Returns human-readable schema violations; [] when `data` is a valid trace. */
export function validateTrace(data: unknown): string[] {
  return checkTrace(data) ? [] : describe(checkTrace.errors);
}

/** Returns human-readable schema violations; [] when `data` is a valid manifest. */
export function validateManifest(data: unknown): string[] {
  return checkManifest(data) ? [] : describe(checkManifest.errors);
}
