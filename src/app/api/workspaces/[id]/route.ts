import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateWorkspaceSchema } from "@/lib/validators/workspace";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace/server";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = updateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400, parsed.error.issues[0]?.message);
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return apiError("ACS-PRM-01", 403);
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return apiError("ACS-WS-02", 500);
  }

  return NextResponse.json({ workspace: data });
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
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return apiError("ACS-PRM-01", 403);
  }

  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) {
    return apiError("ACS-WS-02", 500);
  }

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value === id) {
    cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
  }

  return NextResponse.json({ deleted: true });
}
