import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveWorkspaceForUser } from "@/lib/brand/server";
import { canManageProjects } from "@/lib/types/workspace";
import {
  createProjectSchema,
  projectListQuerySchema,
} from "@/lib/validators/project";

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
  const parsedQuery = projectListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    limit: url.searchParams.get("limit") ?? 20,
    status: url.searchParams.get("status") || undefined,
    brandId: url.searchParams.get("brandId") || undefined,
    q: url.searchParams.get("q") || undefined,
  });

  if (!parsedQuery.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { page, limit, status, brandId, q } = parsedQuery.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("projects")
    .select(
      `
      *,
      brand:brands (
        id,
        name,
        status
      )
    `,
      { count: "exact" }
    )
    .eq("workspace_id", active.workspaceId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (brandId) {
    query = query.eq("brand_id", brandId);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    return apiError("ACS-PRJ-01", 500);
  }

  return NextResponse.json({
    projects: data ?? [],
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

  if (!canManageProjects(active.role)) {
    return apiError("ACS-PRM-01", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const input = parsed.data;

  // Verify the selected brand belongs to the active workspace
  const { data: brand } = await supabase
    .from("brands")
    .select("id, workspace_id")
    .eq("id", input.brandId)
    .eq("workspace_id", active.workspaceId)
    .maybeSingle();

  if (!brand) {
    return apiError("ACS-BRD-01", 404);
  }

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      workspace_id: active.workspaceId,
      brand_id: brand.id,
      name: input.name,
      status: "draft",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (projectErr || !project) {
    return apiError("ACS-PRJ-02", 500);
  }

  const { data: brief, error: briefErr } = await supabase
    .from("content_briefs")
    .insert({
      project_id: project.id,
      topic: input.topic,
      objective: input.objective,
      audience: input.audience,
      content_type: input.contentType,
      slide_count: input.slideCount,
      brief_json: {
        keyPoints: input.keyPoints,
        ctaGoal: input.ctaGoal,
        productFacts: input.productFacts,
        language: input.language,
        toneOverride: input.toneOverride,
      },
    })
    .select("*")
    .single();

  if (briefErr || !brief) {
    await supabase.from("projects").delete().eq("id", project.id);
    return apiError("ACS-PRJ-02", 500);
  }

  return NextResponse.json({ project, brief }, { status: 201 });
}
