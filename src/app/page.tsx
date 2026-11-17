import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/server";
import { HomeClient } from "@/components/landing/home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getWorkspaceContext();

  if (ctx.user) {
    redirect("/dashboard");
  }

  return <HomeClient configured={ctx.configured} />;
}
