import type { ClaimType } from "./types";

export type BucketId =
  | "company"
  | "risk"
  | "event"
  | "legal"
  | "capital"
  | "people"
  | "esg"
  | "research"
  | "other";
export type EntityBucketId = BucketId;

export interface EntityBucketMeta {
  id: EntityBucketId;
  label: string;
  pillClass: string;
  borderClass: string;
}

export const ENTITY_BUCKETS: Record<EntityBucketId, EntityBucketMeta> = {
  company: {
    id: "company",
    label: "Company & Market",
    pillClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    borderClass: "border-l-indigo-600",
  },
  risk: {
    id: "risk",
    label: "Risk",
    pillClass: "bg-rose-50 text-rose-800 border-rose-200",
    borderClass: "border-l-rose-600",
  },
  event: {
    id: "event",
    label: "Material Event",
    pillClass: "bg-orange-50 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-600",
  },
  legal: {
    id: "legal",
    label: "Legal Proceeding",
    pillClass: "bg-violet-50 text-violet-800 border-violet-200",
    borderClass: "border-l-violet-600",
  },
  capital: {
    id: "capital",
    label: "Capital & Guidance",
    pillClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    borderClass: "border-l-emerald-600",
  },
  people: {
    id: "people",
    label: "People & Governance",
    pillClass: "bg-amber-50 text-amber-800 border-amber-200",
    borderClass: "border-l-amber-600",
  },
  esg: {
    id: "esg",
    label: "ESG Commitment",
    pillClass: "bg-teal-50 text-teal-800 border-teal-200",
    borderClass: "border-l-teal-600",
  },
  research: {
    id: "research",
    label: "Research & Macro",
    pillClass: "bg-slate-100 text-slate-700 border-slate-300",
    borderClass: "border-l-slate-500",
  },
  other: {
    id: "other",
    label: "Other",
    pillClass: "bg-zinc-100 text-zinc-700 border-zinc-300",
    borderClass: "border-l-zinc-400",
  },
};

export const INTERNAL_TYPE_TO_BUCKET: Readonly<Record<string, Exclude<BucketId, "other" | "event" | "legal" | "esg">>> = {
  Company: "company",
  Filing: "company",
  Security: "company",
  RevenueSegment: "company",
  Risk: "risk",
  MaterialEvent: "risk",
  LegalProceeding: "risk",
  CapitalStructureEvent: "capital",
  CapitalReturn: "capital",
  GuidanceUpdate: "capital",
  Person: "people",
  InsiderTransaction: "people",
  ESGCommitment: "people",
  Factor: "research",
  Technique: "research",
  ResearchSource: "research",
  Regime: "research",
  ThesisPage: "research",
};

/** Bucket for an internal entity type; types the map does not know fall into "other". */
export function bucketFor(entityType: string): BucketId {
  return Object.hasOwn(INTERNAL_TYPE_TO_BUCKET, entityType)
    ? INTERNAL_TYPE_TO_BUCKET[entityType]
    : "other";
}

export function getEntityBucket(entityType: string): EntityBucketMeta {
  return ENTITY_BUCKETS[bucketFor(entityType)];
}

/** Claim types, each with its own bucket so the claims list reads by what was extracted. */
const CLAIM_TYPE_TO_BUCKET: Readonly<Record<ClaimType, EntityBucketId>> = {
  Risk: "risk",
  MaterialEvent: "event",
  LegalProceeding: "legal",
  CapitalStructureEvent: "capital",
  CapitalReturn: "capital",
  GuidanceUpdate: "capital",
  RevenueSegment: "company",
  ESGCommitment: "esg",
  InsiderTransaction: "people",
};

/** Bucket for a claim: its claim type first, the entity-type bucket when the claim type is missing or unknown. */
export function getClaimBucket(
  claimType: string | null | undefined,
  entityType: string
): EntityBucketMeta {
  if (claimType && Object.hasOwn(CLAIM_TYPE_TO_BUCKET, claimType)) {
    return ENTITY_BUCKETS[CLAIM_TYPE_TO_BUCKET[claimType as ClaimType]];
  }
  return getEntityBucket(entityType);
}
