import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { canManageBrands } from "@/lib/types/workspace";
import { StudioShell } from "@/components/layout/studio-shell";
import { BrandOnboardingClient } from "@/components/brands/brand-onboarding-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewBrandPage() {
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

  if (!ctx.activeWorkspace || !canManageBrands(ctx.role)) {
    redirect("/brands");
  }

  return (
    <StudioShell
      section="brandNew"
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
      <BrandOnboardingClient />
    </StudioShell>
  );
}
