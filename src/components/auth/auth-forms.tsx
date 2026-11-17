"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/components/common/error-notice";
import { ConfigNotice } from "@/components/common/config-notice";
import { getPublicErrorMessage, type ErrorCode } from "@/lib/errors";
import { getDictionary, type Locale } from "@/lib/i18n/messages";

function classifySignUpErrorCode(err: {
  code?: string;
  status?: number;
  message?: string;
}): ErrorCode {
  const code = (err.code ?? "").toLowerCase();
  const msg = (err.message ?? "").toLowerCase();
  const status = err.status ?? 0;

  if (status === 401 || status === 403 || /invalid api key|apikey|jwt/.test(msg)) {
    return "ACS-CFG-01";
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    /already registered|already exists/.test(msg)
  ) {
    return "ACS-AUTH-04";
  }
  if (code === "weak_password" || /password/.test(msg)) {
    return "ACS-AUTH-05";
  }
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    status === 429 ||
    /rate limit|sending.*email|confirmation email|smtp/.test(msg)
  ) {
    return "ACS-AUTH-06";
  }
  if (/database error/.test(msg) || code === "unexpected_failure") {
    return "ACS-AUTH-07";
  }
  if (
    code === "signup_disabled" ||
    code === "email_provider_disabled" ||
    /disabled|redirect/.test(msg)
  ) {
    return "ACS-AUTH-08";
  }
  return "ACS-AUTH-09";
}

interface AuthFormProps {
  configured: boolean;
  locale: Locale;
  initialErrorCode?: string;
}

export function LoginForm({
  configured,
  locale,
  initialErrorCode,
}: AuthFormProps) {
  const router = useRouter();
  const t = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    initialErrorCode
      ? {
          message: t.auth.invalidAuthLink,
          code: initialErrorCode,
        }
      : null
  );

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError({ message: t.common.configNotice, code: "ACS-CFG-01" });
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError({
          message: t.auth.invalidCredentials,
          code: "ACS-AUTH-02",
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError({
        message: t.common.connectionFailed,
        code: "ACS-SYS-01",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setResetError({ message: t.common.configNotice, code: "ACS-CFG-01" });
      return;
    }

    setResetLoading(true);
    try {
      const origin = window.location.origin;
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
        }
      );

      if (err) {
        setResetError({
          message: t.auth.unableReset,
          code: "ACS-AUTH-03",
        });
        return;
      }

      setResetSent(true);
    } catch {
      setResetError({
        message: t.common.connectionFailed,
        code: "ACS-SYS-01",
      });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {!configured ? <ConfigNotice locale={locale} /> : null}
      {error ? (
        <ErrorNotice message={error.message} code={error.code} />
      ) : null}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">{t.auth.email}</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!configured || loading}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="login-password">{t.auth.password}</Label>
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetSent(false);
                setResetError(null);
                setResetOpen(true);
              }}
              disabled={!configured}
              className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50 cursor-pointer"
            >
              {t.auth.forgotPassword}
            </button>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!configured || loading}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!configured || loading}
        >
          {loading ? t.auth.signingIn : t.auth.signInBtn}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-600">
        {t.auth.noAccount}{" "}
        <Link href="/signup" className="font-medium text-blue-700 hover:underline">
          {t.auth.createAccountLink}
        </Link>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.auth.resetModalTitle}</DialogTitle>
            <DialogDescription>{t.auth.resetModalDesc}</DialogDescription>
          </DialogHeader>
          {resetSent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
                {t.auth.resetSentNotice}
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setResetOpen(false)}>
                  {t.auth.done}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError ? (
                <ErrorNotice
                  message={resetError.message}
                  code={resetError.code}
                />
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">{t.auth.email}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetOpen(false)}
                  disabled={resetLoading}
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? t.auth.sending : t.auth.sendResetLink}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SignupForm({
  configured,
  locale,
}: {
  configured: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const t = getDictionary(locale);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError({ message: t.common.configNotice, code: "ACS-CFG-01" });
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        const code = classifySignUpErrorCode(signUpError);
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setConfirmationSent(true);
      }
    } catch {
      setError({
        message: t.common.connectionFailed,
        code: "ACS-SYS-01",
      });
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          {t.auth.verificationSent}
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{t.auth.backToSignIn}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!configured ? <ConfigNotice locale={locale} /> : null}
      {error ? (
        <ErrorNotice message={error.message} code={error.code} />
      ) : null}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">{t.auth.fullName}</Label>
          <Input
            id="signup-name"
            placeholder="Alex Rivera"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={!configured || loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email">{t.auth.email}</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!configured || loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-password">{t.auth.password}</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder={t.auth.minPasswordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!configured || loading}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!configured || loading}
        >
          {loading ? t.auth.creatingAccount : t.auth.createAccountBtn}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-600">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          {t.auth.signInLink}
        </Link>
      </div>
    </div>
  );
}

export function ResetPasswordForm({
  configured,
  locale,
}: {
  configured: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const t = getDictionary(locale);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError({ message: t.common.configNotice, code: "ACS-CFG-01" });
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });
      if (updateErr) {
        setError({
          message: t.auth.unableUpdatePassword,
          code: "ACS-AUTH-03",
        });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError({
        message: t.common.connectionFailed,
        code: "ACS-SYS-01",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {!configured ? <ConfigNotice locale={locale} /> : null}
      {error ? (
        <ErrorNotice message={error.message} code={error.code} />
      ) : null}

      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t.auth.newPassword}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder={t.auth.minPasswordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!configured || loading}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={!configured || loading}
        >
          {loading ? t.auth.updating : t.auth.updatePassword}
        </Button>
      </form>
    </div>
  );
}
