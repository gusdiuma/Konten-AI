"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@/components/common/error-notice";
import { useLocale } from "@/components/common/locale-provider";
import { getPublicErrorMessage, type ErrorCode } from "@/lib/errors";
import {
  BRIEF_LANGUAGES,
  CONTENT_TYPES,
  type AiGenerationJobRecord,
  type BriefLanguage,
  type ContentPlanOutput,
  type ContentType,
  type ProjectDetailData,
  type SlideCopyOutput,
} from "@/lib/types/project";

interface ProjectGenerateClientProps {
  initialData: ProjectDetailData;
  canManage: boolean;
  canDelete: boolean;
  aiConfigured: boolean;
}

const ACTIVE_JOB_STATUSES = new Set([
  "queued",
  "processing",
  "validating",
  "retrying",
]);

function normalizeErrorCode(value: unknown, fallback: ErrorCode): ErrorCode {
  return typeof value === "string" && value.startsWith("ACS-")
    ? (value as ErrorCode)
    : fallback;
}

export function ProjectGenerateClient({
  initialData,
  canManage,
  canDelete,
  aiConfigured,
}: ProjectGenerateClientProps) {
  const router = useRouter();
  const { locale, t } = useLocale();

  const [project, setProject] = useState(initialData.project);
  const [brief, setBrief] = useState(initialData.brief);
  const [latestJob, setLatestJob] = useState<AiGenerationJobRecord | null>(
    initialData.jobs[0] ?? null
  );

  const initialGenerated = initialData.brief?.brief_json?.generated ?? null;
  const [contentPlan, setContentPlan] = useState<ContentPlanOutput | null>(
    initialGenerated?.contentPlan ?? null
  );
  const [slideCopy, setSlideCopy] = useState<SlideCopyOutput | null>(
    initialGenerated?.slideCopy ?? null
  );
  const [hashtagsText, setHashtagsText] = useState<string>(
    (initialGenerated?.slideCopy?.hashtags ?? []).join(" ")
  );

  // Collapsible brief drawer state (minimized by default once generated content exists)
  const [briefOpen, setBriefOpen] = useState(!initialGenerated);

  // Brief form state
  const [name, setName] = useState(initialData.project.name);
  const [topic, setTopic] = useState(initialData.brief?.topic ?? "");
  const [objective, setObjective] = useState(
    initialData.brief?.objective ?? ""
  );
  const [audience, setAudience] = useState(initialData.brief?.audience ?? "");
  const [contentType, setContentType] = useState<ContentType>(
    initialData.brief?.content_type ?? "educational"
  );
  const [slideCount, setSlideCount] = useState(
    String(initialData.brief?.slide_count ?? 5)
  );
  const [language, setLanguage] = useState<BriefLanguage>(
    initialData.brief?.brief_json?.language ?? "id"
  );
  const [keyPoints, setKeyPoints] = useState(
    initialData.brief?.brief_json?.keyPoints ?? ""
  );
  const [ctaGoal, setCtaGoal] = useState(
    initialData.brief?.brief_json?.ctaGoal ?? ""
  );
  const [productFacts, setProductFacts] = useState(
    initialData.brief?.brief_json?.productFacts ?? ""
  );
  const [toneOverride, setToneOverride] = useState(
    initialData.brief?.brief_json?.toneOverride ?? ""
  );

  // Action states
  const [savingBrief, setSavingBrief] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  const isJobRunning =
    latestJob !== null && ACTIVE_JOB_STATUSES.has(latestJob.status);
  const activeJobId = isJobRunning ? latestJob.id : null;

  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/generations/${activeJobId}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled || !res.ok || !data?.job) return;

        const nextJob = data.job as AiGenerationJobRecord;
        setLatestJob(nextJob);

        if (nextJob.status === "completed") {
          const detailRes = await fetch(`/api/projects/${project.id}`, {
            cache: "no-store",
          });
          const detail = (await detailRes.json().catch(() => null)) as
            | ProjectDetailData
            | null;
          if (cancelled) return;

          if (detail?.project) {
            setProject(detail.project);
          }
          if (detail?.brief) {
            setBrief(detail.brief);
            const gen = detail.brief.brief_json?.generated ?? null;
            setContentPlan(gen?.contentPlan ?? null);
            setSlideCopy(gen?.slideCopy ?? null);
            setHashtagsText((gen?.slideCopy?.hashtags ?? []).join(" "));
          }
          setBriefOpen(false);
          setNotice(t.projects.generationReady);
          router.refresh();
        } else if (nextJob.status === "failed") {
          const code = normalizeErrorCode(
            nextJob.error_json?.code,
            "ACS-AI-03"
          );
          setError({
            message: getPublicErrorMessage(code, locale),
            code,
          });
        }
      } catch {
        // Ignore transient network hiccup during polling; next interval retries
      }
    };

    const timer = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeJobId, locale, project.id, router, t.projects.generationReady]);

  async function handleSaveBrief(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setNotice(null);
    setSavingBrief(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brief: {
            topic: topic.trim(),
            objective: objective.trim(),
            audience: audience.trim(),
            contentType,
            slideCount: Number(slideCount),
            language,
            keyPoints: keyPoints.trim(),
            ctaGoal: ctaGoal.trim(),
            productFacts: productFacts.trim(),
            toneOverride: toneOverride.trim(),
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = normalizeErrorCode(data?.error?.code, "ACS-PRJ-02");
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      if (data?.project) setProject(data.project);
      if (data?.brief) setBrief(data.brief);
      setNotice(t.projects.savedNotice);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setSavingBrief(false);
    }
  }

  async function handleGenerate() {
    if (!canManage || !aiConfigured || isJobRunning || startingGeneration) {
      return;
    }

    setError(null);
    setNotice(null);
    setStartingGeneration(true);

    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          jobType: "copywriting",
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = normalizeErrorCode(data?.error?.code, "ACS-AI-03");
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      if (data?.job) {
        setLatestJob(data.job as AiGenerationJobRecord);
      }
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setStartingGeneration(false);
    }
  }

  function updateSlideCopyField(
    index: number,
    field: "hook" | "headline" | "body" | "cta" | "microLabel",
    value: string
  ) {
    setSlideCopy((prev) => {
      if (!prev) return prev;
      const nextSlides = prev.slides.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return { ...prev, slides: nextSlides };
    });
  }

  async function handleSaveCopyEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !contentPlan || !slideCopy) return;

    setError(null);
    setNotice(null);
    setSavingCopy(true);

    const parsedHashtags = hashtagsText
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

    const payloadCopy: SlideCopyOutput = {
      ...slideCopy,
      hashtags: parsedHashtags,
    };

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContent: {
            contentPlan,
            slideCopy: payloadCopy,
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = normalizeErrorCode(data?.error?.code, "ACS-PRJ-02");
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      setSlideCopy(payloadCopy);
      setHashtagsText(parsedHashtags.join(" "));
      setNotice(t.projects.savedNotice);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setSavingCopy(false);
    }
  }

  async function handleDeleteProject() {
    if (!canDelete) return;
    setError(null);
    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = normalizeErrorCode(data?.error?.code, "ACS-PRJ-02");
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        setDeleteOpen(false);
        return;
      }

      router.push("/projects");
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
      setDeleteOpen(false);
    } finally {
      setDeletingProject(false);
    }
  }

  const activeStageKey =
    typeof latestJob?.usage_json?.stage === "string"
      ? latestJob.usage_json.stage
      : null;
  const activeStageLabel = activeStageKey
    ? t.projects.stages[activeStageKey] ?? activeStageKey
    : null;
  const totalTokens =
    typeof latestJob?.usage_json?.totalTokens === "number"
      ? latestJob.usage_json.totalTokens
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/projects">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.common.back}
            </Link>
          </Button>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {project.name}
            </h2>
            <p className="text-xs text-slate-500">
              {project.brand?.name ?? "—"} · {t.projects.statuses[project.status]} ·{" "}
              <span className="tabular-nums">
                {brief?.slide_count ?? Number(slideCount)}
              </span>{" "}
              {t.projects.colSlides.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setBriefOpen((prev) => !prev)}
          >
            {briefOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {t.projects.toggleBrief}
          </Button>

          {canDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
              {t.common.delete}
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {error ? <ErrorNotice message={error.message} code={error.code} /> : null}

      {!aiConfigured ? (
        <ErrorNotice message={t.projects.aiConfigNotice} code="ACS-CFG-01" />
      ) : null}

      {briefOpen ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t.projects.briefSection}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSaveBrief}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-name">
                  {t.projects.projectName}
                </Label>
                <Input
                  id="edit-project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={120}
                  disabled={!canManage}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-topic">{t.projects.topic}</Label>
                <Input
                  id="edit-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  minLength={2}
                  maxLength={240}
                  disabled={!canManage}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-objective">{t.projects.objective}</Label>
                <Input
                  id="edit-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  maxLength={400}
                  disabled={!canManage}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-audience">{t.projects.audience}</Label>
                <Input
                  id="edit-audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder={t.projects.audiencePlaceholder}
                  maxLength={400}
                  disabled={!canManage}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-type">{t.projects.contentType}</Label>
                  <Select
                    value={contentType}
                    onValueChange={(v) => setContentType(v as ContentType)}
                    disabled={!canManage}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t.projects.contentTypes[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-slides">{t.projects.slideCount}</Label>
                  <Select
                    value={slideCount}
                    onValueChange={setSlideCount}
                    disabled={!canManage}
                  >
                    <SelectTrigger id="edit-slides" className="tabular-nums">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <SelectItem key={num} value={String(num)}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-lang">
                    {t.projects.outputLanguage}
                  </Label>
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as BriefLanguage)}
                    disabled={!canManage}
                  >
                    <SelectTrigger id="edit-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRIEF_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {t.projects.languages[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-keypoints">{t.projects.keyPoints}</Label>
                <Textarea
                  id="edit-keypoints"
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  maxLength={1500}
                  disabled={!canManage}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cta">{t.projects.ctaGoal}</Label>
                <Input
                  id="edit-cta"
                  value={ctaGoal}
                  onChange={(e) => setCtaGoal(e.target.value)}
                  maxLength={300}
                  disabled={!canManage}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tone">{t.projects.toneOverride}</Label>
                <Input
                  id="edit-tone"
                  value={toneOverride}
                  onChange={(e) => setToneOverride(e.target.value)}
                  maxLength={240}
                  disabled={!canManage}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-facts">{t.projects.productFacts}</Label>
                <Textarea
                  id="edit-facts"
                  value={productFacts}
                  onChange={(e) => setProductFacts(e.target.value)}
                  maxLength={1500}
                  disabled={!canManage}
                />
              </div>

              {canManage ? (
                <div className="flex justify-end sm:col-span-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={savingBrief || isJobRunning}
                  >
                    <Save className="h-4 w-4" />
                    {savingBrief ? t.common.saving : t.projects.saveBrief}
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            {latestJob ? (
              <>
                <span>
                  {t.projects.jobStatusLabel}:{" "}
                  <span className="font-medium text-slate-900">
                    {t.projects.jobStatuses[latestJob.status]}
                  </span>
                </span>
                {activeStageLabel ? (
                  <span className="text-xs text-slate-500">
                    {activeStageLabel}
                  </span>
                ) : null}
                {totalTokens > 0 ? (
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {t.projects.tokensLabel}: {totalTokens}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-slate-500">{t.projects.noContentYet}</span>
            )}
          </div>

          {canManage ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!aiConfigured || isJobRunning || startingGeneration}
            >
              {isJobRunning || startingGeneration ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isJobRunning || startingGeneration
                ? t.projects.generating
                : contentPlan && slideCopy
                  ? t.projects.regenerateContent
                  : t.projects.generateContent}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {!contentPlan || !slideCopy ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Sparkles className="h-5 w-5 text-slate-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {t.projects.noContentYet}
              </h3>
              <p className="text-sm text-slate-500">
                {t.projects.noContentDesc}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="copy" className="space-y-4">
          <TabsList>
            <TabsTrigger value="copy">{t.projects.tabSlideCopy}</TabsTrigger>
            <TabsTrigger value="plan">{t.projects.tabContentPlan}</TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="space-y-4">
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">
                    {t.projects.angle}
                  </p>
                  <p className="text-sm text-slate-900">{contentPlan.angle}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">
                    {t.projects.storytellingArc}
                  </p>
                  <p className="text-sm text-slate-900">
                    {contentPlan.storytellingArc}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {contentPlan.slides.map((slide) => (
                <Card key={slide.slideOrder}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span className="tabular-nums">
                        {t.projects.slideLabel(slide.slideOrder)}
                      </span>
                      <span className="font-normal text-slate-500">
                        {slide.purpose}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {t.projects.keyMessage}
                      </p>
                      <p className="text-slate-900">{slide.keyMessage}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {t.projects.visualHint}
                      </p>
                      <p className="text-slate-600">{slide.visualHint}</p>
                    </div>
                    {slide.ctaNote ? (
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {t.projects.cta}
                        </p>
                        <p className="text-slate-600">{slide.ctaNote}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="copy">
            <form onSubmit={handleSaveCopyEdits} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {slideCopy.slides.map((slide, index) => (
                  <Card key={slide.slideOrder}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="tabular-nums">
                          {t.projects.slideLabel(slide.slideOrder)}
                        </span>
                        <span className="font-normal text-slate-500">
                          {slide.purpose}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={`slide-${slide.slideOrder}-micro`}>
                            {t.projects.microLabel}
                          </Label>
                          <Input
                            id={`slide-${slide.slideOrder}-micro`}
                            value={slide.microLabel}
                            onChange={(e) =>
                              updateSlideCopyField(
                                index,
                                "microLabel",
                                e.target.value
                              )
                            }
                            maxLength={60}
                            readOnly={!canManage}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`slide-${slide.slideOrder}-hook`}>
                            {t.projects.hook}
                          </Label>
                          <Input
                            id={`slide-${slide.slideOrder}-hook`}
                            value={slide.hook}
                            onChange={(e) =>
                              updateSlideCopyField(
                                index,
                                "hook",
                                e.target.value
                              )
                            }
                            maxLength={180}
                            readOnly={!canManage}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`slide-${slide.slideOrder}-headline`}>
                          {t.projects.headline}
                        </Label>
                        <Input
                          id={`slide-${slide.slideOrder}-headline`}
                          value={slide.headline}
                          onChange={(e) =>
                            updateSlideCopyField(
                              index,
                              "headline",
                              e.target.value
                            )
                          }
                          maxLength={180}
                          readOnly={!canManage}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`slide-${slide.slideOrder}-body`}>
                          {t.projects.body}
                        </Label>
                        <Textarea
                          id={`slide-${slide.slideOrder}-body`}
                          value={slide.body}
                          onChange={(e) =>
                            updateSlideCopyField(index, "body", e.target.value)
                          }
                          maxLength={600}
                          readOnly={!canManage}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`slide-${slide.slideOrder}-cta`}>
                          {t.projects.cta}
                        </Label>
                        <Input
                          id={`slide-${slide.slideOrder}-cta`}
                          value={slide.cta}
                          onChange={(e) =>
                            updateSlideCopyField(index, "cta", e.target.value)
                          }
                          maxLength={160}
                          readOnly={!canManage}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="space-y-4 pt-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="ig-caption">{t.projects.caption}</Label>
                    <Textarea
                      id="ig-caption"
                      value={slideCopy.caption}
                      onChange={(e) =>
                        setSlideCopy((prev) =>
                          prev ? { ...prev, caption: e.target.value } : prev
                        )
                      }
                      maxLength={2200}
                      readOnly={!canManage}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ig-hashtags">{t.projects.hashtags}</Label>
                    <Input
                      id="ig-hashtags"
                      value={hashtagsText}
                      onChange={(e) => setHashtagsText(e.target.value)}
                      readOnly={!canManage}
                    />
                  </div>

                  {canManage ? (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingCopy}>
                        <Save className="h-4 w-4" />
                        {savingCopy
                          ? t.common.saving
                          : t.projects.saveCopyEdits}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </form>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t.projects.deleteProjectTitle(project.name)}
            </DialogTitle>
            <DialogDescription>
              {t.projects.deleteProjectDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deletingProject}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deletingProject}
            >
              {deletingProject ? t.common.deleting : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
