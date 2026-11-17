export const PROJECT_STATUSES = [
  "draft",
  "planning",
  "ready",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const CONTENT_TYPES = [
  "educational",
  "promotional",
  "listicle",
  "storytelling",
  "tips",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const BRIEF_LANGUAGES = ["id", "en"] as const;
export type BriefLanguage = (typeof BRIEF_LANGUAGES)[number];

export const AI_JOB_TYPES = [
  "content_plan",
  "copywriting",
  "design_generation",
  "slide_revision",
] as const;
export type AiJobType = (typeof AI_JOB_TYPES)[number];

export const AI_JOB_STATUSES = [
  "queued",
  "processing",
  "validating",
  "rendering",
  "retrying",
  "completed",
  "failed",
] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

export interface BrandContextSummary {
  brandId: string;
  brandName: string;
  industry: string;
  description: string;
  personality: string;
  positioning: string;
  audience: string;
  tone: string;
  visualRules: string;
  forbiddenElements: string;
  layoutPreferences: string;
  imageDirection: string;
  colors: Array<{ name: string; hex: string; role: string }>;
  fonts: Array<{ family: string; role: string; weights: string[] }>;
  references: Array<{ type: string; notes: string }>;
}

export interface ContentPlanSlide {
  slideOrder: number;
  purpose: string;
  keyMessage: string;
  visualHint: string;
  ctaNote: string;
}

export interface ContentPlanOutput {
  angle: string;
  objective: string;
  storytellingArc: string;
  slides: ContentPlanSlide[];
}

export interface SlideCopyItem {
  slideOrder: number;
  purpose: string;
  hook: string;
  headline: string;
  body: string;
  cta: string;
  microLabel: string;
}

export interface SlideCopyOutput {
  slides: SlideCopyItem[];
  caption: string;
  hashtags: string[];
}

export interface GeneratedContentBundle {
  brandContext: BrandContextSummary;
  contentPlan: ContentPlanOutput;
  slideCopy: SlideCopyOutput;
  generatedAt: string;
  provider: string;
  model: string;
}

export interface ContentBriefJson {
  keyPoints?: string;
  ctaGoal?: string;
  productFacts?: string;
  language?: BriefLanguage;
  toneOverride?: string;
  generated?: GeneratedContentBundle | null;
}

export interface ProjectRecord {
  id: string;
  workspace_id: string;
  brand_id: string;
  name: string;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  brand?: {
    id: string;
    name: string;
    status: string;
  } | null;
  brief?: {
    content_type: ContentType;
    slide_count: number;
  } | null;
}

export interface ContentBriefRecord {
  id: string;
  project_id: string;
  topic: string;
  objective: string;
  audience: string;
  content_type: ContentType;
  slide_count: number;
  brief_json: ContentBriefJson;
  created_at: string;
  updated_at: string;
}

export interface AiGenerationJobRecord {
  id: string;
  project_id: string;
  idempotency_key: string | null;
  job_type: AiJobType;
  status: AiJobStatus;
  provider: string;
  model: string;
  prompt_version: string;
  output_json: Record<string, unknown>;
  error_json: {
    code?: string;
    stage?: string;
  };
  usage_json: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
    durationMs?: number;
    stage?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetailData {
  project: ProjectRecord;
  brief: ContentBriefRecord | null;
  jobs: AiGenerationJobRecord[];
}
