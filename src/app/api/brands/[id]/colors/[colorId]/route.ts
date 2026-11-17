import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidUuid, requireBrandAccess } from "@/lib/brand/server";
import { updateColorSchema } from "@/lib/validators/brand";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; colorId: string }> }
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

  const { id, colorId } = await context.params;
  if (!isValidUuid(colorId)) {
    return apiError("ACS-CLR-01", 404);
  }

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

  const parsed = updateColorSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.hex !== undefined) updates.hex = parsed.data.hex;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.sort_order !== undefined)
    updates.sort_order = parsed.data.sort_order;

  if (Object.keys(updates).length === 0) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: color, error } = await supabase
    .from("brand_colors")
    .update(updates)
    .eq("id", colorId)
    .eq("brand_id", access.brand.id)
    .select("*")
    .maybeSingle();

  if (error || !color) {
    return apiError("ACS-CLR-01", 404);
  }

  return NextResponse.json({ color });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; colorId: string }> }
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

  const { id, colorId } = await context.params;
  if (!isValidUuid(colorId)) {
    return apiError("ACS-CLR-01", 404);
  }

  const access = await requireBrandAccess(supabase, user.id, id, true);
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const { error } = await supabase
    .from("brand_colors")
    .delete()
    .eq("id", colorId)
    .eq("brand_id", access.brand.id);

  if (error) {
    return apiError("ACS-CLR-01", 500);
  }

  return NextResponse.json({ deleted: true });
}
