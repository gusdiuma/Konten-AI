import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { StudioShell } from "@/components/layout/studio-shell";
import { DashboardClient } from "@/components/workspace/dashboard-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const t = getDictionary(locale);

  return (
    <StudioShell
      section="dashboard"
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
      <DashboardClient
        locale={locale}
        workspaces={ctx.workspaces}
        activeWorkspace={ctx.activeWorkspace}
        members={ctx.members}
        userPendingInvitations={ctx.userPendingInvitations}
      />
    </StudioShell>
  );
}
