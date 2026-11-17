import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBrandAccess } from "@/lib/brand/server";
import { upsertGuidelineSchema } from "@/lib/validators/brand";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = upsertGuidelineSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: guideline, error } = await supabase
    .from("brand_guidelines")
    .upsert(
      {
        brand_id: access.brand.id,
        personality: parsed.data.personality,
        positioning: parsed.data.positioning,
        audience: parsed.data.audience,
        tone: parsed.data.tone,
        rules_json: parsed.data.rules_json,
      },
      { onConflict: "brand_id" }
    )
    .select("*")
    .single();

  if (error || !guideline) {
    return apiError("ACS-DNA-01", 500);
  }

  return NextResponse.json({ guideline });
}
