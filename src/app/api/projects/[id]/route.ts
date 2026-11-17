import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectDetail, requireProjectAccess } from "@/lib/project/server";
import {
  updateProjectSchema,
  validateSlideOrderSequence,
} from "@/lib/validators/project";

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
  const access = await requireProjectAccess(supabase, user.id, id, "read");
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const detail = await getProjectDetail(
    access.project.id,
    access.project.workspace_id
  );
  if (!detail) {
    return apiError("ACS-PRJ-01", 404);
  }

  return NextResponse.json(detail);
}

export async function PATCH(
  request: Request,
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
  const access = await requireProjectAccess(supabase, user.id, id, "write");
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ACS-VAL-01", 400);
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("ACS-VAL-01", 400);
  }

  const input = parsed.data;
  const projectUpdates: Record<string, unknown> = {};
  if (input.name !== undefined) projectUpdates.name = input.name;
  if (input.status !== undefined) projectUpdates.status = input.status;

  if (Object.keys(projectUpdates).length > 0) {
    const { error: projErr } = await supabase
      .from("projects")
      .update(projectUpdates)
      .eq("id", access.project.id);
    if (projErr) {
      return apiError("ACS-PRJ-02", 500);
    }
  }

  if (input.brief || input.generatedContent) {
    const { data: existingBrief } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("project_id", access.project.id)
      .maybeSingle();

    if (!existingBrief) {
      return apiError("ACS-PRJ-01", 404);
    }

    const existingJson = (existingBrief.brief_json ?? {}) as Record<
      string,
      unknown
    >;

    const nextBriefJson: Record<string, unknown> = {
      ...existingJson,
    };

    if (input.brief) {
      if (input.brief.keyPoints !== undefined)
        nextBriefJson.keyPoints = input.brief.keyPoints;
      if (input.brief.ctaGoal !== undefined)
        nextBriefJson.ctaGoal = input.brief.ctaGoal;
      if (input.brief.productFacts !== undefined)
        nextBriefJson.productFacts = input.brief.productFacts;
      if (input.brief.language !== undefined)
        nextBriefJson.language = input.brief.language;
      if (input.brief.toneOverride !== undefined)
        nextBriefJson.toneOverride = input.brief.toneOverride;
    }

    if (input.generatedContent) {
      const slideCount = input.brief?.slideCount ?? existingBrief.slide_count;
      if (
        !validateSlideOrderSequence(
          input.generatedContent.contentPlan.slides,
          slideCount
        ) ||
        !validateSlideOrderSequence(
          input.generatedContent.slideCopy.slides,
          slideCount
        )
      ) {
        return apiError("ACS-VAL-01", 400);
      }

      const existingGenerated = (existingJson.generated ?? {}) as Record<
        string,
        unknown
      >;
      nextBriefJson.generated = {
        ...existingGenerated,
        contentPlan: input.generatedContent.contentPlan,
        slideCopy: input.generatedContent.slideCopy,
      };
    }

    const briefUpdates: Record<string, unknown> = {
      brief_json: nextBriefJson,
    };
    if (input.brief?.topic !== undefined) briefUpdates.topic = input.brief.topic;
    if (input.brief?.objective !== undefined)
      briefUpdates.objective = input.brief.objective;
    if (input.brief?.audience !== undefined)
      briefUpdates.audience = input.brief.audience;
    if (input.brief?.contentType !== undefined)
      briefUpdates.content_type = input.brief.contentType;
    if (input.brief?.slideCount !== undefined)
      briefUpdates.slide_count = input.brief.slideCount;

    const { error: briefErr } = await supabase
      .from("content_briefs")
      .update(briefUpdates)
      .eq("id", existingBrief.id);

    if (briefErr) {
      return apiError("ACS-PRJ-02", 500);
    }
  }

  const updated = await getProjectDetail(
    access.project.id,
    access.project.workspace_id
  );
  if (!updated) {
    return apiError("ACS-PRJ-01", 404);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
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
  const access = await requireProjectAccess(supabase, user.id, id, "delete");
  if (!access.ok) {
    return apiError(access.code, access.status);
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", access.project.id);

  if (error) {
    return apiError("ACS-PRJ-02", 500);
  }

  return NextResponse.json({ deleted: true });
}
