"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorNotice } from "@/components/common/error-notice";
import { getDictionary, type Locale } from "@/lib/i18n/messages";
import { getPublicErrorMessage } from "@/lib/errors";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  email: string;
  locale: Locale;
}

export function ProfileDialog({
  open,
  onOpenChange,
  initialName,
  email,
  locale,
}: ProfileDialogProps) {
  const router = useRouter();
  const t = getDictionary(locale);
  const [fullName, setFullName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-PRF-01";
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dialogs.profileTitle}</DialogTitle>
          <DialogDescription>{t.dialogs.profileDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {error ? (
            <ErrorNotice message={error.message} code={error.code} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t.dialogs.emailLabel}</Label>
            <Input id="profile-email" value={email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">{t.dialogs.fullNameLabel}</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              minLength={1}
              maxLength={100}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading || !fullName.trim()}>
              {loading ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
