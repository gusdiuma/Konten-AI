"use client";

import { Settings2 } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n/messages";
import { useLocale } from "@/components/common/locale-provider";

export function ConfigNotice({ locale }: { locale?: Locale }) {
  const ctx = useLocale();
  const t = locale ? getDictionary(locale) : ctx.t;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Settings2 className="h-4 w-4 shrink-0 text-amber-700" />
          <span className="font-medium">{t.common.configNotice}</span>
        </div>
        <span className="font-mono text-xs text-amber-800 shrink-0">
          ACS-CFG-01
        </span>
      </div>
    </div>
  );
}
