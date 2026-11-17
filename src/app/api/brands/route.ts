import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveWorkspaceForUser } from "@/lib/brand/server";
import { canManageBrands } from "@/lib/types/workspace";
import {
  brandListQuerySchema,
  createBrandSchema,
} from "@/lib/validators/brand";

export async function GET(request: Request) {
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

  const active = await resolveActiveWorkspaceForUser(supabase, user.id);
  if (!active) {
    return apiError("ACS-WS-01", 404);
  }

  const url = new URL(request.url);
  const parsedQuery = brandListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    limit: url.searchParams.get("limit") ?? 20,
    status: url.searchParams.get("status") || undefined,
    q: url.searchParams.get("q") || undefined,
  });

  if (!parsedQuery.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { page, limit, status, q } = parsedQuery.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("brands")
    .select("*", { count: "exact" })
    .eq("workspace_id", active.workspaceId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    return apiError("ACS-BRD-01", 500);
  }

  return NextResponse.json({
    brands: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? (data?.length ?? 0),
    },
  });
}

export async function POST(request: Request) {
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

  const active = await resolveActiveWorkspaceForUser(supabase, user.id);
  if (!active) {
    return apiError("ACS-WS-01", 404);
  }

  if (!canManageBrands(active.role)) {
    return apiError("ACS-PRM-01", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const input = parsed.data;
  const { data: brand, error: brandErr } = await supabase
    .from("brands")
    .insert({
      workspace_id: active.workspaceId,
      name: input.name,
      industry: input.industry,
      description: input.description,
      status: "draft",
    })
    .select("*")
    .single();

  if (brandErr || !brand) {
    return apiError("ACS-BRD-02", 500);
  }

  await supabase.from("brand_guidelines").insert({
    brand_id: brand.id,
    personality: input.personality,
    positioning: input.positioning,
    audience: input.audience,
    tone: input.tone,
    rules_json: {},
  });

  const starterColors: Array<{
    brand_id: string;
    name: string;
    hex: string;
    role: string;
    sort_order: number;
  }> = [];

  if (input.primaryColor) {
    starterColors.push({
      brand_id: brand.id,
      name: "Primary",
      hex: input.primaryColor.toUpperCase(),
      role: "primary",
      sort_order: 0,
    });
  }
  if (input.secondaryColor) {
    starterColors.push({
      brand_id: brand.id,
      name: "Secondary",
      hex: input.secondaryColor.toUpperCase(),
      role: "secondary",
      sort_order: 1,
    });
  }
  if (input.textColor) {
    starterColors.push({
      brand_id: brand.id,
      name: "Text",
      hex: input.textColor.toUpperCase(),
      role: "text",
      sort_order: 2,
    });
  }

  if (starterColors.length > 0) {
    await supabase.from("brand_colors").insert(starterColors);
  }

  const starterFonts: Array<{
    brand_id: string;
    family: string;
    role: string;
    weights_json: string[];
  }> = [];

  if (input.headingFont) {
    starterFonts.push({
      brand_id: brand.id,
      family: input.headingFont,
      role: "heading",
      weights_json: ["600", "700"],
    });
  }
  if (input.bodyFont) {
    starterFonts.push({
      brand_id: brand.id,
      family: input.bodyFont,
      role: "body",
      weights_json: ["400", "500"],
    });
  }

  if (starterFonts.length > 0) {
    await supabase.from("brand_fonts").insert(starterFonts);
  }

  return NextResponse.json({ brand }, { status: 201 });
}
