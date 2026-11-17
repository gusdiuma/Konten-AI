import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { getBrandDetail } from "@/lib/brand/server";
import { canManageBrands } from "@/lib/types/workspace";
import { StudioShell } from "@/components/layout/studio-shell";
import { BrandDetailClient } from "@/components/brands/brand-detail-client";
import { ConfigNotice } from "@/components/common/config-notice";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({
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
    redirect("/brands");
  }

  const detail = await getBrandDetail(id, ctx.activeWorkspace.id);
  if (!detail) {
    redirect("/brands");
  }

  return (
    <StudioShell
      section="brandDetail"
      title={detail.brand.name}
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
      <BrandDetailClient
        initialData={detail}
        canManage={canManageBrands(ctx.role)}
      />
    </StudioShell>
  );
}
