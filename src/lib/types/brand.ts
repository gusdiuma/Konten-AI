export const BRAND_STATUSES = ["draft", "approved", "archived"] as const;
export type BrandStatus = (typeof BRAND_STATUSES)[number];

export const COLOR_ROLES = [
  "primary",
  "secondary",
  "accent",
  "background",
  "text",
  "neutral",
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];

export const FONT_ROLES = ["heading", "body", "accent"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

export const ASSET_TYPES = ["logo", "photo", "pattern", "icon", "font"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const REFERENCE_TYPES = ["liked", "disliked", "mandatory"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export interface BrandRulesJson {
  visualRules?: string;
  forbiddenElements?: string;
  layoutPreferences?: string;
  imageDirection?: string;
}

export interface BrandRecord {
  id: string;
  workspace_id: string;
  name: string;
  industry: string;
  description: string;
  status: BrandStatus;
  created_at: string;
  updated_at: string;
}

export interface BrandGuidelineRecord {
  id: string;
  brand_id: string;
  personality: string;
  positioning: string;
  audience: string;
  tone: string;
  rules_json: BrandRulesJson;
  created_at: string;
  updated_at: string;
}

export interface BrandColorRecord {
  id: string;
  brand_id: string;
  name: string;
  hex: string;
  role: ColorRole;
  sort_order: number;
  created_at: string;
}

export interface BrandFontRecord {
  id: string;
  brand_id: string;
  family: string;
  role: FontRole;
  storage_path: string | null;
  weights_json: string[];
  created_at: string;
}

export interface BrandAssetMetadata {
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  altText?: string;
  source?: string;
}

export interface BrandAssetRecord {
  id: string;
  brand_id: string;
  asset_type: AssetType;
  storage_path: string;
  metadata_json: BrandAssetMetadata;
  signed_url?: string | null;
  created_at: string;
}

export interface BrandReferenceRecord {
  id: string;
  brand_id: string;
  asset_id: string | null;
  reference_type: ReferenceType;
  notes: string;
  analysis_json: Record<string, unknown>;
  created_at: string;
  asset?: BrandAssetRecord | null;
}

export interface BrandDetailData {
  brand: BrandRecord;
  guideline: BrandGuidelineRecord | null;
  colors: BrandColorRecord[];
  fonts: BrandFontRecord[];
  assets: BrandAssetRecord[];
  references: BrandReferenceRecord[];
}
