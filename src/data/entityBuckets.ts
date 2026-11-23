export type EntityBucketId = "company" | "risk" | "capital" | "people" | "research";

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
    label: "Risk & Legal",
    pillClass: "bg-rose-50 text-rose-800 border-rose-200",
    borderClass: "border-l-rose-600",
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
  research: {
    id: "research",
    label: "Research & Macro",
    pillClass: "bg-slate-100 text-slate-700 border-slate-300",
    borderClass: "border-l-slate-500",
  },
};

export const INTERNAL_TYPE_TO_BUCKET: Record<string, EntityBucketId> = {
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

export function getEntityBucket(entityType: string): EntityBucketMeta {
  const bucketId = INTERNAL_TYPE_TO_BUCKET[entityType] ?? "research";
  return ENTITY_BUCKETS[bucketId];
}
