import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBrandAccess } from "@/lib/brand/server";
import { createFontSchema } from "@/lib/validators/brand";

export async function POST(
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

  const parsed = createFontSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  if (
    parsed.data.storage_path &&
    !parsed.data.storage_path.startsWith(
      `${access.brand.workspace_id}/${access.brand.id}/`
    )
  ) {
    return apiError("ACS-FNT-01", 400);
  }

  const { data: font, error } = await supabase
    .from("brand_fonts")
    .insert({
      brand_id: access.brand.id,
      family: parsed.data.family,
      role: parsed.data.role,
      storage_path: parsed.data.storage_path ?? null,
      weights_json: parsed.data.weights_json,
    })
    .select("*")
    .single();

  if (error || !font) {
    return apiError("ACS-FNT-01", 500);
  }

  return NextResponse.json({ font }, { status: 201 });
}
