import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBrandAccess } from "@/lib/brand/server";
import { createColorSchema } from "@/lib/validators/brand";

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

  const parsed = createColorSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: color, error } = await supabase
    .from("brand_colors")
    .insert({
      brand_id: access.brand.id,
      name: parsed.data.name,
      hex: parsed.data.hex,
      role: parsed.data.role,
      sort_order: parsed.data.sort_order,
    })
    .select("*")
    .single();

  if (error || !color) {
    return apiError("ACS-CLR-01", 500);
  }

  return NextResponse.json({ color }, { status: 201 });
}
