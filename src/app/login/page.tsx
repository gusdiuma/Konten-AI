import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { AuthShell } from "@/components/auth/auth-shell";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getWorkspaceContext();
  if (ctx.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  return (
    <AuthShell
      mode="login"
      configured={ctx.configured}
      initialErrorCode={params.error}
    />
  );
}
