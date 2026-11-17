import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAND_ASSETS_BUCKET,
  isValidUuid,
  requireBrandAccess,
} from "@/lib/brand/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; assetId: string }> }
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

  const { id, assetId } = await context.params;
  if (!isValidUuid(assetId)) {
    return apiError("ACS-AST-02", 404);
  }

  const access = await requireBrandAccess(supabase, user.id, id, true);
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const { data: existing } = await supabase
    .from("brand_assets")
    .select("id, storage_path")
    .eq("id", assetId)
    .eq("brand_id", access.brand.id)
    .maybeSingle();

  if (!existing) {
    return apiError("ACS-AST-02", 404);
  }

  if (existing.storage_path) {
    await supabase.storage
      .from(BRAND_ASSETS_BUCKET)
      .remove([existing.storage_path]);
  }

  const { error } = await supabase
    .from("brand_assets")
    .delete()
    .eq("id", existing.id)
    .eq("brand_id", access.brand.id);

  if (error) {
    return apiError("ACS-AST-02", 500);
  }

  return NextResponse.json({ deleted: true });
}
