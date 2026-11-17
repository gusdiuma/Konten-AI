import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedAssetUrl, requireBrandAccess } from "@/lib/brand/server";
import { createReferenceSchema } from "@/lib/validators/brand";
import type { BrandAssetRecord } from "@/lib/types/brand";

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

  const parsed = createReferenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  let linkedAsset: BrandAssetRecord | null = null;
  if (parsed.data.asset_id) {
    const { data: assetRow } = await supabase
      .from("brand_assets")
      .select("*")
      .eq("id", parsed.data.asset_id)
      .eq("brand_id", access.brand.id)
      .maybeSingle();

    if (!assetRow) {
      return apiError("ACS-REF-01", 400);
    }

    const signedUrl = await getSignedAssetUrl(supabase, assetRow.storage_path);
    linkedAsset = {
      ...(assetRow as BrandAssetRecord),
      signed_url: signedUrl,
    };
  }

  const { data: reference, error } = await supabase
    .from("brand_references")
    .insert({
      brand_id: access.brand.id,
      asset_id: parsed.data.asset_id ?? null,
      reference_type: parsed.data.reference_type,
      notes: parsed.data.notes,
      analysis_json: {},
    })
    .select("*")
    .single();

  if (error || !reference) {
    return apiError("ACS-REF-01", 500);
  }

  return NextResponse.json(
    {
      reference: {
        ...reference,
        asset: linkedAsset,
      },
    },
    { status: 201 }
  );
}
