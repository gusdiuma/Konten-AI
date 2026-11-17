import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAND_ASSETS_BUCKET,
  getBrandDetail,
  requireBrandAccess,
} from "@/lib/brand/server";
import { updateBrandSchema } from "@/lib/validators/brand";

export async function GET(
  _request: Request,
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
  const access = await requireBrandAccess(supabase, user.id, id, false);
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const detail = await getBrandDetail(access.brand.id, access.brand.workspace_id);
  if (!detail) {
    return apiError("ACS-BRD-01", 404);
  }

  return NextResponse.json(detail);
}

export async function PATCH(
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

  const parsed = updateBrandSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.industry !== undefined) updates.industry = parsed.data.industry;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  if (Object.keys(updates).length === 0) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: brand, error } = await supabase
    .from("brands")
    .update(updates)
    .eq("id", access.brand.id)
    .select("*")
    .single();

  if (error || !brand) {
    return apiError("ACS-BRD-02", 500);
  }

  return NextResponse.json({ brand });
}

export async function DELETE(
  _request: Request,
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

  const { data: assets } = await supabase
    .from("brand_assets")
    .select("storage_path")
    .eq("brand_id", access.brand.id);

  const storagePaths = (assets ?? [])
    .map((a) => a.storage_path)
    .filter(Boolean);

  if (storagePaths.length > 0) {
    await supabase.storage.from(BRAND_ASSETS_BUCKET).remove(storagePaths);
  }

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", access.brand.id);

  if (error) {
    return apiError("ACS-BRD-02", 500);
  }

  return NextResponse.json({ deleted: true });
}
