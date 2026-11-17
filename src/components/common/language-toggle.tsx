"use client";

import { useLocale } from "@/components/common/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  locale?: Locale;
  className?: string;
}

export function LanguageToggle({
  locale: propLocale,
  className,
}: LanguageToggleProps) {
  const { locale: ctxLocale, setLocale } = useLocale();
  const activeLocale = ctxLocale ?? propLocale ?? "en";

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "relative z-10 inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0",
        className
      )}
    >
      <button
        type="button"
        aria-pressed={activeLocale === "id"}
        onClick={() => setLocale("id")}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer select-none",
          activeLocale === "id"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        ID
      </button>
      <button
        type="button"
        aria-pressed={activeLocale === "en"}
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer select-none",
          activeLocale === "en"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        EN
      </button>
    </div>
  );
}
