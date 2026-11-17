import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  ProfileRecord,
  WorkspaceInvitationRecord,
  WorkspaceMemberRecord,
  WorkspaceRole,
  WorkspaceWithRole,
} from "@/lib/types/workspace";

export const ACTIVE_WORKSPACE_COOKIE = "acs_workspace_id";

export interface WorkspaceContextData {
  configured: boolean;
  user: User | null;
  profile: ProfileRecord | null;
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  role: WorkspaceRole | null;
  members: WorkspaceMemberRecord[];
  workspaceInvitations: WorkspaceInvitationRecord[];
  userPendingInvitations: WorkspaceInvitationRecord[];
}

export async function getWorkspaceContext(): Promise<WorkspaceContextData> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      user: null,
      profile: null,
      workspaces: [],
      activeWorkspace: null,
      role: null,
      members: [],
      workspaceInvitations: [],
      userPendingInvitations: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      configured: false,
      user: null,
      profile: null,
      workspaces: [],
      activeWorkspace: null,
      role: null,
      members: [],
      workspaceInvitations: [],
      userPendingInvitations: [],
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: true,
      user: null,
      profile: null,
      workspaces: [],
      activeWorkspace: null,
      role: null,
      members: [],
      workspaceInvitations: [],
      userPendingInvitations: [],
    };
  }

  const [{ data: profile }, { data: memberRows }, { data: userInvites }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
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
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("workspace_invitations")
        .select("id, workspace_id, email, role, status, created_at, expires_at")
        .eq("status", "pending")
        .ilike("email", user.email ?? ""),
    ]);

  const workspaces: WorkspaceWithRole[] = [];
  for (const row of memberRows ?? []) {
    const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
    if (ws) {
      workspaces.push({
        id: ws.id,
        name: ws.name,
        owner_id: ws.owner_id,
        plan: ws.plan,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
        role: row.role as WorkspaceRole,
      });
    }
  }

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeWorkspace =
    workspaces.find((w) => w.id === preferredId) ?? workspaces[0] ?? null;

  let members: WorkspaceMemberRecord[] = [];
  let workspaceInvitations: WorkspaceInvitationRecord[] = [];

  if (activeWorkspace) {
    const [{ data: activeMembers }, { data: activeInvites }] = await Promise.all([
      supabase
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
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true }),
      activeWorkspace.role === "owner" || activeWorkspace.role === "admin"
        ? supabase
            .from("workspace_invitations")
            .select("id, workspace_id, email, role, status, created_at, expires_at")
            .eq("workspace_id", activeWorkspace.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    members = (activeMembers ?? []).map((m) => {
      const prof = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return {
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role as WorkspaceRole,
        created_at: m.created_at,
        profile: prof ?? null,
      };
    });

    workspaceInvitations = (activeInvites ?? []) as WorkspaceInvitationRecord[];
  }

  return {
    configured: true,
    user,
    profile: (profile as ProfileRecord | null) ?? null,
    workspaces,
    activeWorkspace,
    role: activeWorkspace?.role ?? null,
    members,
    workspaceInvitations,
    userPendingInvitations: (userInvites ?? []) as WorkspaceInvitationRecord[],
  };
}
