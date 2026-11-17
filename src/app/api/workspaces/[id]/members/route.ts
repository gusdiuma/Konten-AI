import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inviteMemberSchema } from "@/lib/validators/workspace";

export async function GET(
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

  if (!membership) {
    return apiError("ACS-PRM-01", 403);
  }

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select(
      `
      id,
      workspace_id,
      user_id,
      role,
      created_at,
      profile:profiles (
        id,
        full_name,
        avatar_url,
        email
      )
    `
    )
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return apiError("ACS-MBR-01", 500);
  }

  return NextResponse.json({ members: members ?? [] });
}

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
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return apiError("ACS-PRM-01", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400, parsed.error.issues[0]?.message);
  }

  const email = parsed.data.email;
  const role = parsed.data.role;

  // Check if user already has a profile in the platform (server-only admin lookup)
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      const { data: alreadyMember } = await admin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", id)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (alreadyMember) {
        return apiError("ACS-MBR-01", 409, "User is already a workspace member.");
      }

      const { data: addedMember, error: addError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: id,
          user_id: existingProfile.id,
          role,
        })
        .select(
          `
          id,
          workspace_id,
          user_id,
          role,
          created_at,
          profile:profiles (
            id,
            full_name,
            avatar_url,
            email
          )
        `
        )
        .single();

      if (addError || !addedMember) {
        return apiError("ACS-MBR-01", 500);
      }

      return NextResponse.json({ status: "added", member: addedMember }, { status: 201 });
    }
  }

  // Otherwise create a pending invitation record
  const { data: invitation, error: invError } = await supabase
    .from("workspace_invitations")
    .insert({
      workspace_id: id,
      email,
      role,
      invited_by: user.id,
      status: "pending",
    })
    .select("id, workspace_id, email, role, status, created_at, expires_at")
    .single();

  if (invError || !invitation) {
    return apiError("ACS-INV-01", 400);
  }

  return NextResponse.json({ status: "invited", invitation }, { status: 201 });
}
