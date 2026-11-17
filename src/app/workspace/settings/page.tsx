import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { StudioShell } from "@/components/layout/studio-shell";
import { WorkspaceSettingsClient } from "@/components/workspace/workspace-settings-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
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
      section="settings"
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
      <WorkspaceSettingsClient
        locale={locale}
        activeWorkspace={ctx.activeWorkspace}
        members={ctx.members}
        invitations={ctx.workspaceInvitations}
        currentUserId={ctx.user.id}
      />
    </StudioShell>
  );
}
