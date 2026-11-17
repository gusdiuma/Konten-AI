import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { listWorkspaceBrands } from "@/lib/brand/server";
import { listWorkspaceProjects } from "@/lib/project/server";
import { StudioShell } from "@/components/layout/studio-shell";
import { ProjectsListClient } from "@/components/projects/projects-list-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [ctx, locale] = await Promise.all([
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

  const [projects, brands] = ctx.activeWorkspace
    ? await Promise.all([
        listWorkspaceProjects(ctx.activeWorkspace.id),
        listWorkspaceBrands(ctx.activeWorkspace.id),
      ])
    : [[], []];

  return (
    <StudioShell
      section="projects"
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
      <ProjectsListClient
        activeWorkspace={ctx.activeWorkspace}
        projects={projects}
        hasBrands={brands.length > 0}
      />
    </StudioShell>
  );
}
