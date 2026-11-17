import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { listWorkspaceBrands } from "@/lib/brand/server";
import { StudioShell } from "@/components/layout/studio-shell";
import { BrandsListClient } from "@/components/brands/brands-list-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
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

  const brands = ctx.activeWorkspace
    ? await listWorkspaceBrands(ctx.activeWorkspace.id)
    : [];

  return (
    <StudioShell
      section="brands"
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
      <BrandsListClient
        activeWorkspace={ctx.activeWorkspace}
        brands={brands}
      />
    </StudioShell>
  );
}
