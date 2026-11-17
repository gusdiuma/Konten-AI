export const WORKSPACE_ROLES = [
  "owner",
  "admin",
  "designer",
  "content_creator",
  "client",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const INVITABLE_ROLES = [
  "admin",
  "designer",
  "content_creator",
  "client",
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const WORKSPACE_PLANS = ["free", "pro", "agency"] as const;
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  designer: "Designer",
  content_creator: "Content Creator",
  client: "Client",
};

export const ROLE_CAPABILITIES: Record<WorkspaceRole, string> = {
  owner: "Full workspace, members, brands, projects, settings",
  admin: "Brands, projects, assets, non-owner members",
  designer: "View brands, manage projects, edit canvas, export",
  content_creator: "Manage briefs and copywriting",
  client: "Preview shared projects, comment, limited approval",
};

export function canManageWorkspace(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteWorkspace(role: WorkspaceRole | null): boolean {
  return role === "owner";
}

export function canManageMembers(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canManageBrands(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export interface ProfileRecord {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  owner_id: string;
  plan: WorkspacePlan;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWithRole extends WorkspaceRecord {
  role: WorkspaceRole;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export interface WorkspaceInvitationRecord {
  id: string;
  workspace_id: string;
  email: string;
  role: InvitableRole;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  expires_at: string;
  workspace_name?: string;
}
