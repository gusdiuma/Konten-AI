"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/common/language-toggle";
import { useLocale } from "@/components/common/locale-provider";
import {
  LoginForm,
  ResetPasswordForm,
  SignupForm,
} from "@/components/auth/auth-forms";

interface AuthShellProps {
  mode: "login" | "signup" | "reset";
  configured: boolean;
  initialErrorCode?: string;
}

export function AuthShell({
  mode,
  configured,
  initialErrorCode,
}: AuthShellProps) {
  const { locale, t } = useLocale();

  const title =
    mode === "login"
      ? t.auth.signInTitle
      : mode === "signup"
        ? t.auth.signUpTitle
        : t.auth.resetTitle;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            {t.common.brand}
          </Link>
          <LanguageToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <LoginForm
                configured={configured}
                locale={locale}
                initialErrorCode={initialErrorCode}
              />
            ) : mode === "signup" ? (
              <SignupForm configured={configured} locale={locale} />
            ) : (
              <ResetPasswordForm configured={configured} locale={locale} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
