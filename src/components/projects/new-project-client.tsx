"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Palette, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@/components/common/error-notice";
import { useLocale } from "@/components/common/locale-provider";
import { getPublicErrorMessage, type ErrorCode } from "@/lib/errors";
import type { BrandRecord } from "@/lib/types/brand";
import {
  BRIEF_LANGUAGES,
  CONTENT_TYPES,
  type BriefLanguage,
  type ContentType,
} from "@/lib/types/project";

interface NewProjectClientProps {
  brands: BrandRecord[];
}

export function NewProjectClient({ brands }: NewProjectClientProps) {
  const router = useRouter();
  const { locale, t } = useLocale();

  const [brandId, setBrandId] = useState<string>(brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [contentType, setContentType] = useState<ContentType>("educational");
  const [slideCount, setSlideCount] = useState("5");
  const [language, setLanguage] = useState<BriefLanguage>(
    locale === "en" ? "en" : "id"
  );
  const [keyPoints, setKeyPoints] = useState("");
  const [ctaGoal, setCtaGoal] = useState("");
  const [productFacts, setProductFacts] = useState("");
  const [toneOverride, setToneOverride] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  if (brands.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <Button asChild size="sm" variant="outline">
            <Link href="/projects">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.common.back}
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Palette className="h-5 w-5 text-slate-700" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                {t.projects.needBrandTitle}
              </h2>
              <p className="text-sm text-slate-500">
                {t.projects.needBrandDesc}
              </p>
            </div>
            <Button asChild>
              <Link href="/brands/new">
                <Plus className="h-4 w-4" />
                {t.projects.goToBrands}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          name: name.trim(),
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
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = (data?.error?.code as ErrorCode | undefined) ?? "ACS-PRJ-02";
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      router.push(`/projects/${data.project.id}/generate`);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Button asChild size="sm" variant="outline">
          <Link href="/projects">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.common.back}
          </Link>
        </Button>
      </div>

      {error ? <ErrorNotice message={error.message} code={error.code} /> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t.projects.briefSection}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-brand">{t.projects.selectBrand}</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger id="project-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-name">{t.projects.projectName}</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.projects.projectNamePlaceholder}
                minLength={2}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="project-topic">{t.projects.topic}</Label>
              <Input
                id="project-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.projects.topicPlaceholder}
                minLength={2}
                maxLength={240}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-objective">{t.projects.objective}</Label>
              <Input
                id="project-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder={t.projects.objectivePlaceholder}
                maxLength={400}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-audience">{t.projects.audience}</Label>
              <Input
                id="project-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={t.projects.audiencePlaceholder}
                maxLength={400}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-type">{t.projects.contentType}</Label>
                <Select
                  value={contentType}
                  onValueChange={(v) => setContentType(v as ContentType)}
                >
                  <SelectTrigger id="project-type">
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
                <Label htmlFor="project-slides">{t.projects.slideCount}</Label>
                <Select value={slideCount} onValueChange={setSlideCount}>
                  <SelectTrigger id="project-slides" className="tabular-nums">
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
                <Label htmlFor="project-lang">
                  {t.projects.outputLanguage}
                </Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as BriefLanguage)}
                >
                  <SelectTrigger id="project-lang">
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
              <Label htmlFor="project-keypoints">{t.projects.keyPoints}</Label>
              <Textarea
                id="project-keypoints"
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder={t.projects.keyPointsPlaceholder}
                maxLength={1500}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-cta">{t.projects.ctaGoal}</Label>
              <Input
                id="project-cta"
                value={ctaGoal}
                onChange={(e) => setCtaGoal(e.target.value)}
                placeholder={t.projects.ctaGoalPlaceholder}
                maxLength={300}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-tone">{t.projects.toneOverride}</Label>
              <Input
                id="project-tone"
                value={toneOverride}
                onChange={(e) => setToneOverride(e.target.value)}
                placeholder={t.projects.toneOverridePlaceholder}
                maxLength={240}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="project-facts">{t.projects.productFacts}</Label>
              <Textarea
                id="project-facts"
                value={productFacts}
                onChange={(e) => setProductFacts(e.target.value)}
                placeholder={t.projects.productFactsPlaceholder}
                maxLength={1500}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/projects">{t.common.cancel}</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t.common.creating : t.common.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
