import { Type, type Schema } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AiProviderError,
  getAiProvider,
  type AiUsageMetrics,
} from "@/lib/ai/provider";
import type { BrandDetailData } from "@/lib/types/brand";
import type {
  BrandContextSummary,
  ContentBriefRecord,
  ContentPlanOutput,
  ContentType,
  GeneratedContentBundle,
  SlideCopyOutput,
} from "@/lib/types/project";
import {
  contentPlanOutputSchema,
  slideCopyOutputSchema,
  validateSlideOrderSequence,
} from "@/lib/validators/project";

export const PROMPT_VERSION = "m3-v1";

const STORYTELLING_DEFAULTS: Record<ContentType, string> = {
  educational: "Hook -> Problem -> Explanation -> Solution -> Summary/CTA",
  promotional: "Hook -> Need -> Benefit -> Proof/Offer -> CTA",
  listicle: "Hook -> Numbered Points -> Explanation -> Summary",
  storytelling: "Opening -> Context -> Conflict -> Turning Point -> Lesson/CTA",
  tips: "Hook -> Sequential Tips -> Concrete Example -> CTA",
};

const CONTENT_PLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    angle: { type: Type.STRING },
    objective: { type: Type.STRING },
    storytellingArc: { type: Type.STRING },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slideOrder: { type: Type.INTEGER },
          purpose: { type: Type.STRING },
          keyMessage: { type: Type.STRING },
          visualHint: { type: Type.STRING },
          ctaNote: { type: Type.STRING },
        },
        required: [
          "slideOrder",
          "purpose",
          "keyMessage",
          "visualHint",
          "ctaNote",
        ],
      },
    },
  },
  required: ["angle", "objective", "storytellingArc", "slides"],
};

const SLIDE_COPY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slideOrder: { type: Type.INTEGER },
          purpose: { type: Type.STRING },
          hook: { type: Type.STRING },
          headline: { type: Type.STRING },
          body: { type: Type.STRING },
          cta: { type: Type.STRING },
          microLabel: { type: Type.STRING },
        },
        required: [
          "slideOrder",
          "purpose",
          "hook",
          "headline",
          "body",
          "cta",
          "microLabel",
        ],
      },
    },
    caption: { type: Type.STRING },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["slides", "caption", "hashtags"],
};

export function buildBrandContext(detail: BrandDetailData): BrandContextSummary {
  return {
    brandId: detail.brand.id,
    brandName: detail.brand.name,
    industry: detail.brand.industry,
    description: detail.brand.description,
    personality: detail.guideline?.personality ?? "",
    positioning: detail.guideline?.positioning ?? "",
    audience: detail.guideline?.audience ?? "",
    tone: detail.guideline?.tone ?? "",
    visualRules: detail.guideline?.rules_json?.visualRules ?? "",
    forbiddenElements: detail.guideline?.rules_json?.forbiddenElements ?? "",
    layoutPreferences: detail.guideline?.rules_json?.layoutPreferences ?? "",
    imageDirection: detail.guideline?.rules_json?.imageDirection ?? "",
    colors: detail.colors.map((c) => ({
      name: c.name,
      hex: c.hex,
      role: c.role,
    })),
    fonts: detail.fonts.map((f) => ({
      family: f.family,
      role: f.role,
      weights: Array.isArray(f.weights_json) ? f.weights_json : ["400", "700"],
    })),
    references: detail.references.map((r) => ({
      type: r.reference_type,
      notes: r.notes,
    })),
  };
}

function mergeUsage(a: AiUsageMetrics, b: AiUsageMetrics): AiUsageMetrics {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    candidatesTokens: a.candidatesTokens + b.candidatesTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    durationMs: a.durationMs + b.durationMs,
  };
}

function parseJsonSafe(rawText: string, stage: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    throw new AiProviderError("ACS-AI-02", stage, "Invalid JSON payload");
  }
}

async function generateWithBoundedRepair<T>(params: {
  stage: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  validate: (parsed: unknown) => T | null;
  onRetrying?: () => Promise<void>;
}): Promise<{ data: T; usage: AiUsageMetrics; provider: string; model: string }> {
  const provider = getAiProvider();

  const first = await provider.generateStructuredJson({
    stage: params.stage,
    systemInstruction: params.systemInstruction,
    prompt: params.prompt,
    responseSchema: params.responseSchema,
  });

  try {
    const parsedJson = parseJsonSafe(first.rawText, params.stage);
    const validated = params.validate(parsedJson);
    if (validated) {
      return {
        data: validated,
        usage: first.usage,
        provider: first.provider,
        model: first.model,
      };
    }
  } catch (err) {
    if (!(err instanceof AiProviderError)) {
      throw err;
    }
  }

  // Bounded 1-time repair attempt when JSON or Zod validation fails
  if (params.onRetrying) {
    await params.onRetrying();
  }

  const repairPrompt = `${params.prompt}

PREVIOUS OUTPUT WAS INVALID OR DID NOT MATCH THE REQUIRED SLIDE COUNT / SCHEMA.
Return ONLY valid JSON strictly matching the schema and exact slideCount.`;

  const second = await provider.generateStructuredJson({
    stage: params.stage,
    systemInstruction: params.systemInstruction,
    prompt: repairPrompt,
    responseSchema: params.responseSchema,
  });

  const secondJson = parseJsonSafe(second.rawText, params.stage);
  const repaired = params.validate(secondJson);
  if (!repaired) {
    throw new AiProviderError(
      "ACS-AI-02",
      params.stage,
      "Schema validation failed after repair attempt"
    );
  }

  return {
    data: repaired,
    usage: mergeUsage(first.usage, second.usage),
    provider: second.provider,
    model: second.model,
  };
}

export async function runStagedContentGeneration(params: {
  brandContext: BrandContextSummary;
  brief: ContentBriefRecord;
  onStageChange?: (
    status: "processing" | "validating" | "retrying",
    stage: string
  ) => Promise<void>;
}): Promise<{
  bundle: GeneratedContentBundle;
  usage: AiUsageMetrics;
}> {
  const { brandContext, brief, onStageChange } = params;
  const outputLanguage =
    brief.brief_json?.language === "en" ? "English" : "Indonesian (Bahasa Indonesia)";
  const defaultPattern = STORYTELLING_DEFAULTS[brief.content_type];

  // Stage 2: Content Strategist
  if (onStageChange) {
    await onStageChange("processing", "content_strategist");
  }

  const strategistSystem = `You are a senior Instagram Content Strategist inside AI Creative Studio.
Design a cohesive ${brief.slide_count}-slide Instagram carousel content plan grounded strictly in the brand context and user brief.
Rules:
- Output language: ${outputLanguage}.
- Follow the storytelling pattern: ${defaultPattern}.
- Respect all brand tone, audience, and forbidden elements.
- Never fabricate prices, addresses, testimonials, statistics, or product claims not provided in the brief.
- Produce exactly ${brief.slide_count} slides numbered 1..${brief.slide_count}.`;

  const strategistPrompt = JSON.stringify({
    brandContext,
    brief: {
      topic: brief.topic,
      objective: brief.objective,
      audience: brief.audience || brandContext.audience,
      contentType: brief.content_type,
      slideCount: brief.slide_count,
      keyPoints: brief.brief_json?.keyPoints ?? "",
      ctaGoal: brief.brief_json?.ctaGoal ?? "",
      productFacts: brief.brief_json?.productFacts ?? "",
      toneOverride: brief.brief_json?.toneOverride ?? "",
    },
  });

  const planResult = await generateWithBoundedRepair<ContentPlanOutput>({
    stage: "content_strategist",
    systemInstruction: strategistSystem,
    prompt: strategistPrompt,
    responseSchema: CONTENT_PLAN_SCHEMA,
    onRetrying: onStageChange
      ? () => onStageChange("retrying", "content_strategist")
      : undefined,
    validate: (raw) => {
      const parsed = contentPlanOutputSchema.safeParse(raw);
      if (!parsed.success) return null;
      if (!validateSlideOrderSequence(parsed.data.slides, brief.slide_count)) {
        return null;
      }
      return {
        ...parsed.data,
        slides: [...parsed.data.slides].sort(
          (a, b) => a.slideOrder - b.slideOrder
        ),
      };
    },
  });

  // Stage 3: Copywriter
  if (onStageChange) {
    await onStageChange("processing", "copywriter");
  }

  const copywriterSystem = `You are a senior Carousel Copywriter inside AI Creative Studio.
Write concise, high-impact Instagram carousel copy for every slide based on the approved Content Plan and Brand DNA.
Rules:
- Output language: ${outputLanguage}.
- Match brand tone (${brandContext.tone || "clear, helpful, confident"})${
    brief.brief_json?.toneOverride
      ? ` and brief override (${brief.brief_json.toneOverride})`
      : ""
  }.
- Keep slide copy scannable for a 1080x1350 visual canvas:
  * hook: short scroll-stopping opener (max ~8 words, especially strong on slide 1)
  * headline: crisp slide title (max ~10 words)
  * body: focused explanation (1-3 short sentences, max ~45 words)
  * cta: clear action prompt (strong on final slide; empty or subtle swipe cue on middle slides)
  * microLabel: short category/step tag like "01" or "TIP 02"
- STRICT FACT RULE: Never invent prices, discounts, addresses, dates, testimonials, or unprovided product specs. Use "[PLACEHOLDER]" if any factual detail is missing.
- Produce exactly ${brief.slide_count} slides numbered 1..${brief.slide_count}, plus an Instagram caption and 3-8 relevant hashtags.`;

  const copywriterPrompt = JSON.stringify({
    brandContext: {
      brandName: brandContext.brandName,
      industry: brandContext.industry,
      personality: brandContext.personality,
      positioning: brandContext.positioning,
      audience: brandContext.audience,
      tone: brandContext.tone,
      forbiddenElements: brandContext.forbiddenElements,
    },
    brief: {
      topic: brief.topic,
      objective: brief.objective,
      ctaGoal: brief.brief_json?.ctaGoal ?? "",
      productFacts: brief.brief_json?.productFacts ?? "",
      slideCount: brief.slide_count,
    },
    contentPlan: planResult.data,
  });

  const copyResult = await generateWithBoundedRepair<SlideCopyOutput>({
    stage: "copywriter",
    systemInstruction: copywriterSystem,
    prompt: copywriterPrompt,
    responseSchema: SLIDE_COPY_SCHEMA,
    onRetrying: onStageChange
      ? () => onStageChange("retrying", "copywriter")
      : undefined,
    validate: (raw) => {
      const parsed = slideCopyOutputSchema.safeParse(raw);
      if (!parsed.success) return null;
      if (!validateSlideOrderSequence(parsed.data.slides, brief.slide_count)) {
        return null;
      }
      return {
        ...parsed.data,
        slides: [...parsed.data.slides].sort(
          (a, b) => a.slideOrder - b.slideOrder
        ),
      };
    },
  });

  if (onStageChange) {
    await onStageChange("validating", "schema_validation");
  }

  return {
    bundle: {
      brandContext,
      contentPlan: planResult.data,
      slideCopy: copyResult.data,
      generatedAt: new Date().toISOString(),
      provider: copyResult.provider,
      model: copyResult.model,
    },
    usage: mergeUsage(planResult.usage, copyResult.usage),
  };
}

export async function executeContentGenerationJob(params: {
  supabase: SupabaseClient;
  jobId: string;
  projectId: string;
  brandDetail: BrandDetailData;
  brief: ContentBriefRecord;
}) {
  const { supabase, jobId, projectId, brandDetail, brief } = params;

  const updateJob = async (fields: Record<string, unknown>) => {
    await supabase.from("ai_generation_jobs").update(fields).eq("id", jobId);
  };

  try {
    await updateJob({
      status: "processing",
      usage_json: { stage: "brand_analyst" },
    });

    const brandContext = buildBrandContext(brandDetail);

    const { bundle, usage } = await runStagedContentGeneration({
      brandContext,
      brief,
      onStageChange: async (status, stage) => {
        await updateJob({
          status,
          usage_json: { stage },
        });
      },
    });

    const mergedBriefJson = {
      ...(brief.brief_json ?? {}),
      generated: bundle,
    };

    const [{ error: briefUpdateErr }, { error: projUpdateErr }] =
      await Promise.all([
        supabase
          .from("content_briefs")
          .update({ brief_json: mergedBriefJson })
          .eq("id", brief.id),
        supabase
          .from("projects")
          .update({ status: "planning" })
          .eq("id", projectId)
          .eq("status", "draft"),
      ]);

    if (briefUpdateErr || projUpdateErr) {
      await updateJob({
        status: "failed",
        error_json: { code: "ACS-PRJ-02", stage: "persist_output" },
      });
      return;
    }

    await updateJob({
      status: "completed",
      output_json: {
        contentPlan: bundle.contentPlan,
        slideCopy: bundle.slideCopy,
      },
      usage_json: {
        ...usage,
        stage: "completed",
      },
      error_json: {},
    });
  } catch (err) {
    const code = err instanceof AiProviderError ? err.code : "ACS-AI-03";
    const stage = err instanceof AiProviderError ? err.stage : "pipeline";

    await updateJob({
      status: "failed",
      error_json: { code, stage },
    });
  }
}
