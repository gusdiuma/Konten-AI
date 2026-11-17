"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@/components/common/error-notice";
import { useLocale } from "@/components/common/locale-provider";
import { getPublicErrorMessage, type ErrorCode } from "@/lib/errors";

export function BrandOnboardingClient() {
  const router = useRouter();
  const { locale, t } = useLocale();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");
  const [positioning, setPositioning] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");

  const [primaryColor, setPrimaryColor] = useState("#1D4ED8");
  const [secondaryColor, setSecondaryColor] = useState("#0F172A");
  const [textColor, setTextColor] = useState("#111827");

  const [headingFont, setHeadingFont] = useState("Plus Jakarta Sans");
  const [bodyFont, setBodyFont] = useState("Inter");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim(),
          description: description.trim(),
          personality: personality.trim(),
          positioning: positioning.trim(),
          audience: audience.trim(),
          tone: tone.trim(),
          primaryColor: primaryColor.trim() || undefined,
          secondaryColor: secondaryColor.trim() || undefined,
          textColor: textColor.trim() || undefined,
          headingFont: headingFont.trim() || undefined,
          bodyFont: bodyFont.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = (data?.error?.code as ErrorCode | undefined) ?? "ACS-BRD-02";
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      router.push(`/brands/${data.brand.id}`);
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
          <Link href="/brands">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.common.back}
          </Link>
        </Button>
      </div>

      {error ? <ErrorNotice message={error.message} code={error.code} /> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t.brands.identitySection}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">{t.brands.brandName}</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.brands.brandNamePlaceholder}
                minLength={2}
                maxLength={80}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand-industry">{t.brands.industry}</Label>
              <Input
                id="brand-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t.brands.industryPlaceholder}
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="brand-desc">{t.brands.description}</Label>
              <Textarea
                id="brand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.brands.descriptionPlaceholder}
                maxLength={600}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t.brands.tabDna}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dna-personality">{t.brands.personality}</Label>
              <Input
                id="dna-personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder={t.brands.personalityPlaceholder}
                maxLength={400}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dna-tone">{t.brands.tone}</Label>
              <Input
                id="dna-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder={t.brands.tonePlaceholder}
                maxLength={400}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dna-positioning">{t.brands.positioning}</Label>
              <Input
                id="dna-positioning"
                value={positioning}
                onChange={(e) => setPositioning(e.target.value)}
                placeholder={t.brands.positioningPlaceholder}
                maxLength={400}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dna-audience">{t.brands.audience}</Label>
              <Input
                id="dna-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={t.brands.audiencePlaceholder}
                maxLength={400}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.brands.starterPalette}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  id: "color-primary",
                  label: t.brands.primaryColor,
                  value: primaryColor,
                  setter: setPrimaryColor,
                },
                {
                  id: "color-secondary",
                  label: t.brands.secondaryColor,
                  value: secondaryColor,
                  setter: setSecondaryColor,
                },
                {
                  id: "color-text",
                  label: t.brands.textColor,
                  value: textColor,
                  setter: setTextColor,
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3"
                >
                  <div className="space-y-1">
                    <Label htmlFor={item.id}>{item.label}</Label>
                    <Input
                      id={item.id}
                      value={item.value}
                      onChange={(e) => item.setter(e.target.value)}
                      className="font-mono"
                      maxLength={7}
                    />
                  </div>
                  <input
                    type="color"
                    aria-label={item.label}
                    value={/^#[0-9a-fA-F]{6}$/.test(item.value) ? item.value : "#0F172A"}
                    onChange={(e) => item.setter(e.target.value.toUpperCase())}
                    className="mt-5 h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.brands.starterTypography}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="heading-font">{t.brands.headingFont}</Label>
                <Input
                  id="heading-font"
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body-font">{t.brands.bodyFont}</Label>
                <Input
                  id="body-font"
                  value={bodyFont}
                  onChange={(e) => setBodyFont(e.target.value)}
                  maxLength={80}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/brands">{t.common.cancel}</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t.common.creating : t.common.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
