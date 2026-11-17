import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvitationSchema } from "@/lib/validators/workspace";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace/server";
import { z } from "zod";

const revokeSchema = z.object({
  invitationId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

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

  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: workspaceId, error } = await supabase.rpc(
    "accept_workspace_invitation",
    {
      p_invitation_id: parsed.data.invitationId,
    }
  );

  if (error || !workspaceId) {
    return apiError("ACS-INV-01", 400);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, String(workspaceId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ workspaceId });
}

export async function DELETE(request: Request) {
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

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { data: actor } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!actor || !["owner", "admin"].includes(actor.role)) {
    return apiError("ACS-PRM-01", 403);
  }

  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked" })
    .eq("id", parsed.data.invitationId)
    .eq("workspace_id", parsed.data.workspaceId);

  if (error) {
    return apiError("ACS-INV-01", 500);
  }

  return NextResponse.json({ revoked: true });
}
