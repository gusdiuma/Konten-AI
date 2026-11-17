import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createWorkspaceSchema,
  paginationQuerySchema,
} from "@/lib/validators/workspace";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace/server";

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

  const url = new URL(request.url);
  const parsedQuery = paginationQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    limit: url.searchParams.get("limit") ?? 20,
  });

  if (!parsedQuery.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { page, limit } = parsedQuery.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("workspace_members")
    .select(
      `
      role,
      workspace:workspaces (
        id,
        name,
        owner_id,
        plan,
        created_at,
        updated_at
      )
    `,
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) {
    return apiError("ACS-WS-01", 500);
  }

  const workspaces = (data ?? [])
    .map((row) => {
      const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
      return ws ? { ...ws, role: row.role } : null;
    })
    .filter(Boolean);

  return NextResponse.json({
    workspaces,
    pagination: {
      page,
      limit,
      total: count ?? workspaces.length,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = createWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400, parsed.error.issues[0]?.message);
  }

  // Ensure profile exists before creating workspace
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      email: user.email ?? null,
    },
    { onConflict: "id" }
  );

  // Insert workspace; DB trigger handle_new_workspace() adds owner to workspace_members
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      name: parsed.data.name,
      owner_id: user.id,
      plan: "free",
    })
    .select("*")
    .single();

  if (error || !workspace) {
    return apiError("ACS-WS-02", 500);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json(
    {
      workspace: {
        ...workspace,
        role: "owner",
      },
    },
    { status: 201 }
  );
}
