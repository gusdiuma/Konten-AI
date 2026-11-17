import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateMemberRoleSchema } from "@/lib/validators/workspace";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; memberId: string }> }
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

  const { id, memberId } = await context.params;
  const { data: actor } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!actor || !["owner", "admin"].includes(actor.role)) {
    return apiError("ACS-PRM-01", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: target } = await supabase
    .from("workspace_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("workspace_id", id)
    .maybeSingle();

  if (!target) {
    return apiError("ACS-MBR-01", 404);
  }
  if (target.role === "owner") {
    return apiError("ACS-MBR-02", 403);
  }

  const { data: updated, error } = await supabase
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("id", memberId)
    .eq("workspace_id", id)
    .select("id, workspace_id, user_id, role, created_at")
    .single();

  if (error || !updated) {
    return apiError("ACS-MBR-01", 500);
  }

  return NextResponse.json({ member: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; memberId: string }> }
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

  const { id, memberId } = await context.params;
  const { data: actor } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: target } = await supabase
    .from("workspace_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("workspace_id", id)
    .maybeSingle();

  if (!target) {
    return apiError("ACS-MBR-01", 404);
  }
  if (target.role === "owner") {
    return apiError("ACS-MBR-02", 403);
  }

  const isAdmin = Boolean(actor && ["owner", "admin"].includes(actor.role));
  const isSelf = target.user_id === user.id;
  if (!isAdmin && !isSelf) {
    return apiError("ACS-PRM-01", 403);
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", id);

  if (error) {
    return apiError("ACS-MBR-01", 500);
  }

  return NextResponse.json({ removed: true });
}
