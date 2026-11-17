"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  getDictionary,
  LOCALE_COOKIE,
  normalizeLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/messages";

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persistLocaleCookie(next: Locale) {
  if (typeof document === "undefined") return;
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const sameSite = isHttps ? "SameSite=None; Secure" : "SameSite=Lax";
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; ${sameSite}`;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_COOKIE);
      if (stored === "id" || stored === "en") {
        const normalized = normalizeLocale(stored);
        if (normalized !== initialLocale) {
          setLocaleState(normalized);
          document.documentElement.lang = normalized;
          persistLocaleCookie(normalized);
        }
      }
    } catch {
      // Ignore storage access restrictions
    }
  }, [initialLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
      try {
        window.localStorage.setItem(LOCALE_COOKIE, next);
      } catch {
        // Ignore storage access restrictions
      }
      persistLocaleCookie(next);
      startTransition(() => {
        router.refresh();
      });
    },
    [router]
  );

  const t = getDictionary(locale);

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en",
      t: getDictionary("en"),
      setLocale: () => {},
    };
  }
  return ctx;
}
