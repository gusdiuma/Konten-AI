import { Type, type Schema } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBrandDetail, requireBrandAccess } from "@/lib/brand/server";
import {
  AiProviderError,
  getAiProvider,
  isAiProviderConfigured,
} from "@/lib/ai/provider";
import { buildBrandContext } from "@/lib/ai/content-pipeline";

const brandAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(10).max(600),
  voiceDirectives: z.array(z.string().trim().min(2).max(200)).min(1).max(6),
  visualDoList: z.array(z.string().trim().min(2).max(200)).min(1).max(6),
  visualDontList: z.array(z.string().trim().min(2).max(200)).max(6).default([]),
});

const BRAND_ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    voiceDirectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    visualDoList: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    visualDontList: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["summary", "voiceDirectives", "visualDoList", "visualDontList"],
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !isAiProviderConfigured()) {
    return apiError("ACS-CFG-01", 503);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return apiError("ACS-CFG-01", 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError("ACS-AUTH-01", 401);
  }

  const { id } = await context.params;
  const access = await requireBrandAccess(supabase, user.id, id, true);
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const detail = await getBrandDetail(access.brand.id, access.brand.workspace_id);
  if (!detail) {
    return apiError("ACS-BRD-01", 404);
  }

  try {
    const provider = getAiProvider();
    const brandContext = buildBrandContext(detail);

    const res = await provider.generateStructuredJson({
      stage: "brand_analyst",
      systemInstruction:
        "You are a Brand Analyst. Synthesize the provided Brand DNA, palette, fonts, and reference notes into actionable directives for carousel design. Never invent brand facts not present in the input.",
      prompt: JSON.stringify(brandContext),
      responseSchema: BRAND_ANALYSIS_SCHEMA,
    });

    const parsedJson = JSON.parse(res.rawText);
    const validated = brandAnalysisOutputSchema.safeParse(parsedJson);
    if (!validated.success) {
      return apiError("ACS-AI-02", 422);
    }

    if (detail.references.length > 0) {
      await supabase
        .from("brand_references")
        .update({ analysis_json: validated.data })
        .eq("brand_id", access.brand.id);
    }

    return NextResponse.json({
      analysis: validated.data,
      usage: res.usage,
      model: res.model,
    });
  } catch (err) {
    const code = err instanceof AiProviderError ? err.code : "ACS-AI-01";
    return apiError(code, 502);
  }
}
