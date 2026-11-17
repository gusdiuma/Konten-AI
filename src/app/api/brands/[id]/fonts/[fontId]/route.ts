import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidUuid, requireBrandAccess } from "@/lib/brand/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; fontId: string }> }
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

  const { id, fontId } = await context.params;
  if (!isValidUuid(fontId)) {
    return apiError("ACS-FNT-01", 404);
  }

  const access = await requireBrandAccess(supabase, user.id, id, true);
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const { error } = await supabase
    .from("brand_fonts")
    .delete()
    .eq("id", fontId)
    .eq("brand_id", access.brand.id);

  if (error) {
    return apiError("ACS-FNT-01", 500);
  }

  return NextResponse.json({ deleted: true });
}
