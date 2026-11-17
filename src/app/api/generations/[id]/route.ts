import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/brand/server";
import { requireProjectAccess } from "@/lib/project/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return apiError("ACS-CFG-01", 503);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return apiError("ACS-CFG-01", 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError("ACS-AUTH-01", 401);
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return apiError("ACS-AI-03", 404);
  }

  const { data: job } = await supabase
    .from("ai_generation_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!job) {
    return apiError("ACS-AI-03", 404);
  }

  const access = await requireProjectAccess(
    supabase,
    user.id,
    job.project_id,
    "read"
  );
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  return NextResponse.json({ job });
}
