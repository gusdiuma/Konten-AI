import { after, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { apiError } from "@/lib/errors";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBrandDetail } from "@/lib/brand/server";
import { requireProjectAccess } from "@/lib/project/server";
import {
  getConfiguredAiModel,
  isAiProviderConfigured,
} from "@/lib/ai/provider";
import {
  executeContentGenerationJob,
  PROMPT_VERSION,
} from "@/lib/ai/content-pipeline";
import { triggerGenerationSchema } from "@/lib/validators/project";
import type { ContentBriefRecord } from "@/lib/types/project";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAiProviderConfigured()) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = triggerGenerationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const { projectId, jobType, idempotencyKey } = parsed.data;
  if (jobType !== "content_plan" && jobType !== "copywriting") {
    return apiError("ACS-VAL-01", 400);
  }

  const access = await requireProjectAccess(supabase, user.id, projectId, "write");
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  // Idempotency guard: prevent duplicate jobs from double-clicks
  const { data: existingJob } = await supabase
    .from("ai_generation_jobs")
    .select("*")
    .eq("project_id", access.project.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingJob) {
    return NextResponse.json(
      { job: existingJob, deduplicated: true },
      { status: 200 }
    );
  }

  const [{ data: brief }, brandDetail] = await Promise.all([
    supabase
      .from("content_briefs")
      .select("*")
      .eq("project_id", access.project.id)
      .maybeSingle(),
    getBrandDetail(access.project.brand_id, access.project.workspace_id),
  ]);

  if (!brief) {
    return apiError("ACS-PRJ-01", 404);
  }
  if (!brandDetail) {
    return apiError("ACS-BRD-01", 404);
  }

  const model = getConfiguredAiModel();
  const { data: job, error: insertErr } = await supabase
    .from("ai_generation_jobs")
    .insert({
      project_id: access.project.id,
      idempotency_key: idempotencyKey,
      job_type: jobType,
      status: "queued",
      provider: "gemini",
      model,
      prompt_version: PROMPT_VERSION,
      output_json: {},
      error_json: {},
      usage_json: { stage: "queued" },
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insertErr || !job) {
    // Handle concurrent race on idempotency key gracefully
    const { data: raceJob } = await supabase
      .from("ai_generation_jobs")
      .select("*")
      .eq("project_id", access.project.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (raceJob) {
      return NextResponse.json(
        { job: raceJob, deduplicated: true },
        { status: 200 }
      );
    }
    return apiError("ACS-AI-03", 500);
  }

  // Prepare stateless Supabase client for background after() execution
  let bgSupabase = createSupabaseAdminClient();
  if (!bgSupabase) {
    const publicEnv = getSupabasePublicEnv();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (publicEnv && session?.access_token) {
      bgSupabase = createClient(publicEnv.url, publicEnv.anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  if (!bgSupabase) {
    await supabase
      .from("ai_generation_jobs")
      .update({
        status: "failed",
        error_json: { code: "ACS-CFG-01", stage: "background_init" },
      })
      .eq("id", job.id);
    return apiError("ACS-CFG-01", 503);
  }

  const jobId = job.id;
  const briefRecord = brief as ContentBriefRecord;

  after(async () => {
    await executeContentGenerationJob({
      supabase: bgSupabase,
      jobId,
      projectId: access.project.id,
      brandDetail,
      brief: briefRecord,
    });
  });

  return NextResponse.json({ job }, { status: 202 });
}
