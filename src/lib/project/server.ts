import type { SupabaseClient } from "@supabase/supabase-js";
import type { ErrorCode } from "@/lib/errors";
import { isValidUuid } from "@/lib/brand/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canDeleteProjects,
  canManageProjects,
  type WorkspaceRole,
} from "@/lib/types/workspace";
import type {
  AiGenerationJobRecord,
  ContentBriefRecord,
  ProjectDetailData,
  ProjectRecord,
} from "@/lib/types/project";

export async function requireProjectAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  requiredAccess: "read" | "write" | "delete"
): Promise<
  | {
      ok: true;
      project: { id: string; workspace_id: string; brand_id: string };
      role: WorkspaceRole;
    }
  | { ok: false; code: ErrorCode; status: number }
> {
  if (!isValidUuid(projectId)) {
    return { ok: false, code: "ACS-PRJ-01", status: 404 };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id, brand_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, code: "ACS-PRJ-01", status: 404 };
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, code: "ACS-PRJ-01", status: 404 };
  }

  const role = membership.role as WorkspaceRole;
  if (requiredAccess === "write" && !canManageProjects(role)) {
    return { ok: false, code: "ACS-PRM-01", status: 403 };
  }
  if (requiredAccess === "delete" && !canDeleteProjects(role)) {
    return { ok: false, code: "ACS-PRM-01", status: 403 };
  }

  return { ok: true, project, role };
}

export async function listWorkspaceProjects(
  workspaceId: string
): Promise<ProjectRecord[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("projects")
    .select(
      `
      *,
      brand:brands (
        id,
        name,
        status
      ),
      brief:content_briefs (
        content_type,
        slide_count
      )
    `
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    ...(row as ProjectRecord),
    brand: Array.isArray(row.brand) ? row.brand[0] ?? null : row.brand ?? null,
    brief: Array.isArray(row.brief) ? row.brief[0] ?? null : row.brief ?? null,
  }));
}

export async function getProjectDetail(
  projectId: string,
  workspaceId: string
): Promise<ProjectDetailData | null> {
  if (!isValidUuid(projectId) || !isValidUuid(workspaceId)) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: project } = await supabase
    .from("projects")
    .select(
      `
      *,
      brand:brands (
        id,
        name,
        status
      )
    `
    )
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!project) return null;

  const [{ data: brief }, { data: jobs }] = await Promise.all([
    supabase
      .from("content_briefs")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("ai_generation_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const normalizedProject: ProjectRecord = {
    ...(project as ProjectRecord),
    brand: Array.isArray(project.brand)
      ? project.brand[0] ?? null
      : project.brand ?? null,
  };

  return {
    project: normalizedProject,
    brief: (brief as ContentBriefRecord | null) ?? null,
    jobs: (jobs ?? []) as AiGenerationJobRecord[],
  };
}
