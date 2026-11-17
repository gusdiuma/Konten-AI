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

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  locale,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const t = getDictionary(locale);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-WS-02";
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }

      setName("");
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
          <DialogTitle>{t.dialogs.newWorkspaceTitle}</DialogTitle>
          <DialogDescription>{t.dialogs.newWorkspaceDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <ErrorNotice message={error.message} code={error.code} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">
              {t.dialogs.workspaceNameLabel}
            </Label>
            <Input
              id="workspace-name"
              placeholder={t.dialogs.workspacePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              required
              autoFocus
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
            <Button type="submit" disabled={loading || name.trim().length < 2}>
              {loading ? t.common.creating : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
