import { z } from "zod";
import {
  ASSET_TYPES,
  BRAND_STATUSES,
  COLOR_ROLES,
  FONT_ROLES,
  REFERENCE_TYPES,
  type AssetType,
} from "@/lib/types/brand";

const hexRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const createBrandSchema = z.object({
  name: z.string().trim().min(2).max(80),
  industry: z.string().trim().max(80).default(""),
  description: z.string().trim().max(600).default(""),
  personality: z.string().trim().max(400).default(""),
  positioning: z.string().trim().max(400).default(""),
  audience: z.string().trim().max(400).default(""),
  tone: z.string().trim().max(400).default(""),
  primaryColor: z.string().trim().regex(hexRegex).optional(),
  secondaryColor: z.string().trim().regex(hexRegex).optional(),
  textColor: z.string().trim().regex(hexRegex).optional(),
  headingFont: z.string().trim().min(1).max(80).optional(),
  bodyFont: z.string().trim().min(1).max(80).optional(),
});

export const updateBrandSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  industry: z.string().trim().max(80).optional(),
  description: z.string().trim().max(600).optional(),
  status: z.enum(BRAND_STATUSES).optional(),
});

export const upsertGuidelineSchema = z.object({
  personality: z.string().trim().max(600).default(""),
  positioning: z.string().trim().max(600).default(""),
  audience: z.string().trim().max(600).default(""),
  tone: z.string().trim().max(600).default(""),
  rules_json: z
    .object({
      visualRules: z.string().trim().max(1000).optional(),
      forbiddenElements: z.string().trim().max(1000).optional(),
      layoutPreferences: z.string().trim().max(1000).optional(),
      imageDirection: z.string().trim().max(1000).optional(),
    })
    .default({}),
});

export const createColorSchema = z.object({
  name: z.string().trim().min(1).max(60),
  hex: z
    .string()
    .trim()
    .regex(hexRegex, "Hex format required (#RRGGBB)")
    .transform((v) => v.toUpperCase()),
  role: z.enum(COLOR_ROLES),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const updateColorSchema = createColorSchema.partial();

export const createFontSchema = z.object({
  family: z.string().trim().min(1).max(80),
  role: z.enum(FONT_ROLES),
  storage_path: z.string().trim().max(300).nullable().optional(),
  weights_json: z.array(z.string().trim().min(1).max(12)).min(1).max(10).default(["400", "600", "700"]),
});

export const createReferenceSchema = z.object({
  asset_id: z.string().uuid().nullable().optional(),
  reference_type: z.enum(REFERENCE_TYPES),
  notes: z.string().trim().min(1).max(800),
});

export const brandListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(BRAND_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
});

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
const IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const FONT_EXTENSIONS = new Set(["woff2", "ttf", "otf"]);
const FONT_MIMES = new Set([
  "font/woff2",
  "font/ttf",
  "font/otf",
  "application/font-woff2",
  "application/octet-stream",
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FONT_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateBrandUpload(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  assetType: AssetType;
}): { ok: true; ext: string; safeName: string } | { ok: false } {
  const { fileName, mimeType, sizeBytes, assetType } = params;

  if (!ASSET_TYPES.includes(assetType)) {
    return { ok: false };
  }
  if (!fileName || sizeBytes <= 0) {
    return { ok: false };
  }

  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dotIdx = base.lastIndexOf(".");
  if (dotIdx <= 0) {
    return { ok: false };
  }

  const ext = base.slice(dotIdx + 1).toLowerCase();
  const rawStem = base.slice(0, dotIdx);
  const safeStem = rawStem
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const safeName = `${safeStem || "asset"}.${ext}`;

  if (assetType === "font") {
    if (!FONT_EXTENSIONS.has(ext) || sizeBytes > MAX_FONT_BYTES) {
      return { ok: false };
    }
    if (mimeType && !FONT_MIMES.has(mimeType.toLowerCase())) {
      return { ok: false };
    }
    return { ok: true, ext, safeName };
  }

  if (!IMAGE_EXTENSIONS.has(ext) || sizeBytes > MAX_IMAGE_BYTES) {
    return { ok: false };
  }
  if (!IMAGE_MIMES.has(mimeType.toLowerCase())) {
    return { ok: false };
  }

  return { ok: true, ext, safeName };
}
