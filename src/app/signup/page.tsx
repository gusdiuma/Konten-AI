import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { AuthShell } from "@/components/auth/auth-shell";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const ctx = await getWorkspaceContext();
  if (ctx.user) {
    redirect("/dashboard");
  }

  return <AuthShell mode="signup" configured={ctx.configured} />;
}
