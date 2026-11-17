"use client";

import Link from "next/link";
import { ArrowRight, Layers, Palette, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/common/config-notice";
import { LanguageToggle } from "@/components/common/language-toggle";
import { useLocale } from "@/components/common/locale-provider";

export function HomeClient({ configured }: { configured: boolean }) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col">
      <header className="flex h-16 items-center justify-between gap-6 border-b border-slate-200 bg-white px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          {t.common.brand}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link
            href="/login"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            {t.landing.signIn}
          </Link>
          <Link
            href="/signup"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            {t.landing.createAccount}
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageToggle />
          <Button asChild size="sm">
            <Link href="/login">{t.landing.openStudio}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="max-w-2xl space-y-6">
          <h1
            className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
            style={{ textWrap: "balance" }}
          >
            {t.landing.heroTitle}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            {t.landing.heroSubtitle}
          </p>

          {!configured ? <ConfigNotice /> : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="lg">
              <Link href="/signup">
                {t.landing.getStarted}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">{t.landing.signIn}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 border-t border-slate-200 pt-10 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <ShieldCheck className="h-5 w-5 text-slate-800" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              {t.landing.feature1Title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t.landing.feature1Desc}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <Palette className="h-5 w-5 text-slate-800" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              {t.landing.feature2Title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t.landing.feature2Desc}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <Layers className="h-5 w-5 text-slate-800" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              {t.landing.feature3Title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t.landing.feature3Desc}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
