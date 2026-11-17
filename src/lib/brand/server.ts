import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ErrorCode } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace/server";
import { canManageBrands, type WorkspaceRole } from "@/lib/types/workspace";
import type {
  BrandAssetRecord,
  BrandColorRecord,
  BrandDetailData,
  BrandFontRecord,
  BrandGuidelineRecord,
  BrandRecord,
  BrandReferenceRecord,
} from "@/lib/types/brand";

export const BRAND_ASSETS_BUCKET = "brand-assets";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function resolveActiveWorkspaceForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ workspaceId: string; role: WorkspaceRole } | null> {
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const list = memberships ?? [];
  if (list.length === 0) return null;

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const active = list.find((m) => m.workspace_id === preferredId) ?? list[0];

  return {
    workspaceId: active.workspace_id,
    role: active.role as WorkspaceRole,
  };
}

export async function requireBrandAccess(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  writeRequired: boolean
): Promise<
  | {
      ok: true;
      brand: { id: string; workspace_id: string };
      role: WorkspaceRole;
    }
  | { ok: false; code: ErrorCode; status: number }
> {
  if (!isValidUuid(brandId)) {
    return { ok: false, code: "ACS-BRD-01", status: 404 };
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, workspace_id")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    return { ok: false, code: "ACS-BRD-01", status: 404 };
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", brand.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, code: "ACS-BRD-01", status: 404 };
  }

  const role = membership.role as WorkspaceRole;
  if (writeRequired && !canManageBrands(role)) {
    return { ok: false, code: "ACS-PRM-01", status: 403 };
  }

  return { ok: true, brand, role };
}

export async function getSignedAssetUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

export async function listWorkspaceBrands(
  workspaceId: string
): Promise<BrandRecord[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return (data ?? []) as BrandRecord[];
}

export async function getBrandDetail(
  brandId: string,
  workspaceId: string
): Promise<BrandDetailData | null> {
  if (!isValidUuid(brandId) || !isValidUuid(workspaceId)) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!brand) return null;

  const [
    { data: guideline },
    { data: colors },
    { data: fonts },
    { data: assets },
    { data: references },
  ] = await Promise.all([
    supabase
      .from("brand_guidelines")
      .select("*")
      .eq("brand_id", brandId)
      .maybeSingle(),
    supabase
      .from("brand_colors")
      .select("*")
      .eq("brand_id", brandId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("brand_fonts")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true }),
    supabase
      .from("brand_assets")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false }),
    supabase
      .from("brand_references")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false }),
  ]);

  const rawAssets = (assets ?? []) as BrandAssetRecord[];
  const signedMap = new Map<string, string | null>();

  if (rawAssets.length > 0) {
    const paths = rawAssets.map((a) => a.storage_path);
    const { data: signedList } = await supabase.storage
      .from(BRAND_ASSETS_BUCKET)
      .createSignedUrls(paths, 3600);

    for (const item of signedList ?? []) {
      if (item.path) {
        signedMap.set(item.path, item.signedUrl ?? null);
      }
    }
  }

  const hydratedAssets: BrandAssetRecord[] = rawAssets.map((asset) => ({
    ...asset,
    signed_url: signedMap.get(asset.storage_path) ?? null,
  }));

  const assetById = new Map(hydratedAssets.map((a) => [a.id, a]));
  const hydratedRefs: BrandReferenceRecord[] = (
    (references ?? []) as BrandReferenceRecord[]
  ).map((ref) => ({
    ...ref,
    asset: ref.asset_id ? (assetById.get(ref.asset_id) ?? null) : null,
  }));

  return {
    brand: brand as BrandRecord,
    guideline: (guideline as BrandGuidelineRecord | null) ?? null,
    colors: (colors ?? []) as BrandColorRecord[],
    fonts: (fonts ?? []) as BrandFontRecord[],
    assets: hydratedAssets,
    references: hydratedRefs,
  };
}
