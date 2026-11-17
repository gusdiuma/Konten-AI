import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { getProjectDetail } from "@/lib/project/server";
import { isAiProviderConfigured } from "@/lib/ai/provider";
import {
  canDeleteProjects,
  canManageProjects,
} from "@/lib/types/workspace";
import { StudioShell } from "@/components/layout/studio-shell";
import { ProjectGenerateClient } from "@/components/projects/project-generate-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProjectGeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, ctx, locale] = await Promise.all([
    params,
    getWorkspaceContext(),
    getServerLocale(),
  ]);

  if (!ctx.configured) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ConfigNotice locale={locale} />
      </div>
    );
  }

  if (!ctx.user) {
    redirect("/login");
  }

  if (!ctx.activeWorkspace) {
    redirect("/projects");
  }

  const detail = await getProjectDetail(id, ctx.activeWorkspace.id);
  if (!detail) {
    redirect("/projects");
  }

  return (
    <StudioShell
      section="projectGenerate"
      title={detail.project.name}
      locale={locale}
      userEmail={ctx.user.email ?? ""}
      userName={
        ctx.profile?.full_name ||
        (ctx.user.user_metadata?.full_name as string | undefined) ||
        ""
      }
      workspaces={ctx.workspaces}
      activeWorkspace={ctx.activeWorkspace}
    >
      <ProjectGenerateClient
        initialData={detail}
        canManage={canManageProjects(ctx.role)}
        canDelete={canDeleteProjects(ctx.role)}
        aiConfigured={isAiProviderConfigured()}
      />
    </StudioShell>
  );
}
