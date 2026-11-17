import { redirect } from "next/navigation";

export default async function ProjectRootRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/generate`);
}
