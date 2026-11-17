import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAND_ASSETS_BUCKET,
  getSignedAssetUrl,
  requireBrandAccess,
} from "@/lib/brand/server";
import { ASSET_TYPES, type AssetType } from "@/lib/types/brand";
import { validateBrandUpload } from "@/lib/validators/brand";

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const file = formData.get("file");
  const rawAssetType = String(formData.get("asset_type") ?? "");
  const altText = String(formData.get("alt_text") ?? "").trim().slice(0, 140);

  if (!(file instanceof File)) {
    return apiError("ACS-AST-01", 400);
  }

  if (!ASSET_TYPES.includes(rawAssetType as AssetType)) {
    return apiError("ACS-AST-01", 400);
  }

  const assetType = rawAssetType as AssetType;
  const validated = validateBrandUpload({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    assetType,
  });

  if (!validated.ok) {
    return apiError("ACS-AST-01", 400);
  }

  const storagePath = `${access.brand.workspace_id}/${access.brand.id}/${crypto.randomUUID()}-${validated.safeName}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadErr) {
    return apiError("ACS-AST-02", 500);
  }

  const { data: asset, error: insertErr } = await supabase
    .from("brand_assets")
    .insert({
      brand_id: access.brand.id,
      asset_type: assetType,
      storage_path: storagePath,
      metadata_json: {
        originalName: file.name.slice(0, 120),
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        altText: altText || undefined,
        source: "upload",
      },
    })
    .select("*")
    .single();

  if (insertErr || !asset) {
    await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([storagePath]);
    return apiError("ACS-AST-02", 500);
  }

  const signedUrl = await getSignedAssetUrl(supabase, storagePath);

  return NextResponse.json(
    {
      asset: {
        ...asset,
        signed_url: signedUrl,
      },
    },
    { status: 201 }
  );
}
