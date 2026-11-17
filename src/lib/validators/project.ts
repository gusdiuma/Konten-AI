import { z } from "zod";
import {
  AI_JOB_TYPES,
  BRIEF_LANGUAGES,
  CONTENT_TYPES,
  PROJECT_STATUSES,
} from "@/lib/types/project";

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(PROJECT_STATUSES).optional(),
  brandId: z.string().uuid().optional(),
  q: z.string().trim().max(80).optional(),
});

export const createProjectSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  topic: z.string().trim().min(2).max(240),
  objective: z.string().trim().max(400).default(""),
  audience: z.string().trim().max(400).default(""),
  contentType: z.enum(CONTENT_TYPES),
  slideCount: z.coerce.number().int().min(3).max(10),
  keyPoints: z.string().trim().max(1500).default(""),
  ctaGoal: z.string().trim().max(300).default(""),
  productFacts: z.string().trim().max(1500).default(""),
  language: z.enum(BRIEF_LANGUAGES).default("id"),
  toneOverride: z.string().trim().max(240).default(""),
});

export const contentPlanSlideSchema = z.object({
  slideOrder: z.number().int().min(1).max(10),
  purpose: z.string().trim().min(1).max(60),
  keyMessage: z.string().trim().min(1).max(400),
  visualHint: z.string().trim().min(1).max(300),
  ctaNote: z.string().trim().max(200).default(""),
});

export const contentPlanOutputSchema = z.object({
  angle: z.string().trim().min(2).max(300),
  objective: z.string().trim().min(2).max(300),
  storytellingArc: z.string().trim().min(2).max(400),
  slides: z.array(contentPlanSlideSchema).min(3).max(10),
});

export const slideCopyItemSchema = z.object({
  slideOrder: z.number().int().min(1).max(10),
  purpose: z.string().trim().min(1).max(60),
  hook: z.string().trim().max(180).default(""),
  headline: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(600),
  cta: z.string().trim().max(160).default(""),
  microLabel: z.string().trim().max(60).default(""),
});

export const slideCopyOutputSchema = z.object({
  slides: z.array(slideCopyItemSchema).min(3).max(10),
  caption: z.string().trim().min(1).max(2200),
  hashtags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  brief: z
    .object({
      topic: z.string().trim().min(2).max(240).optional(),
      objective: z.string().trim().max(400).optional(),
      audience: z.string().trim().max(400).optional(),
      contentType: z.enum(CONTENT_TYPES).optional(),
      slideCount: z.coerce.number().int().min(3).max(10).optional(),
      keyPoints: z.string().trim().max(1500).optional(),
      ctaGoal: z.string().trim().max(300).optional(),
      productFacts: z.string().trim().max(1500).optional(),
      language: z.enum(BRIEF_LANGUAGES).optional(),
      toneOverride: z.string().trim().max(240).optional(),
    })
    .optional(),
  generatedContent: z
    .object({
      contentPlan: contentPlanOutputSchema,
      slideCopy: slideCopyOutputSchema,
    })
    .optional(),
});

export const triggerGenerationSchema = z.object({
  projectId: z.string().uuid(),
  jobType: z.enum(AI_JOB_TYPES).default("copywriting"),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export function validateSlideOrderSequence(
  slides: Array<{ slideOrder: number }>,
  expectedCount: number
): boolean {
  if (slides.length !== expectedCount) return false;
  const sorted = [...slides].sort((a, b) => a.slideOrder - b.slideOrder);
  return sorted.every((s, idx) => s.slideOrder === idx + 1);
}
