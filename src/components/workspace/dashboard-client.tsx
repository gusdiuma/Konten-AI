"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { ErrorNotice } from "@/components/common/error-notice";
import { useLocale } from "@/components/common/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import { getPublicErrorMessage } from "@/lib/errors";
import type {
  WorkspaceInvitationRecord,
  WorkspaceMemberRecord,
  WorkspaceWithRole,
} from "@/lib/types/workspace";

interface DashboardClientProps {
  locale?: Locale;
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  members: WorkspaceMemberRecord[];
  userPendingInvitations: WorkspaceInvitationRecord[];
}

export function DashboardClient({
  workspaces,
  activeWorkspace,
  members,
  userPendingInvitations,
}: DashboardClientProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  async function handleAcceptInvitation(invitationId: string) {
    setError(null);
    setAcceptingId(invitationId);
    try {
      const res = await fetch("/api/workspaces/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-INV-01";
        setError({
          message: getPublicErrorMessage(code, locale),
          code,
        });
        return;
      }
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setAcceptingId(null);
    }
  }

  const dateLocale = locale === "id" ? "id-ID" : "en-US";

  return (
    <div className="space-y-6">
      {error ? <ErrorNotice message={error.message} code={error.code} /> : null}

      {userPendingInvitations.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t.dashboard.pendingInvitations}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userPendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-900">
                    {inv.email}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    · {t.dashboard.rolePrefix}: {t.roles[inv.role]}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={acceptingId === inv.id}
                  onClick={() => handleAcceptInvitation(inv.id)}
                >
                  {acceptingId === inv.id ? t.common.joining : t.common.accept}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!activeWorkspace ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Building2 className="h-5 w-5 text-slate-700" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.emptyTitle}
              </h2>
              <p className="text-sm text-slate-500">{t.dashboard.emptyDesc}</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.shell.createWorkspace}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500">
                  {t.dashboard.activeWorkspace}
                </div>
                <div className="mt-1.5 truncate text-lg font-semibold text-slate-900">
                  {activeWorkspace.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t.dashboard.rolePrefix}: {t.roles[activeWorkspace.role]} ·{" "}
                  {t.dashboard.planLabel}:{" "}
                  <span className="capitalize">{activeWorkspace.plan}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500">
                  {t.dashboard.teamMembers}
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
                  {members.length}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t.dashboard.activeSeats}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500">
                  {t.dashboard.workspacesLabel}
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
                  {workspaces.length}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t.dashboard.accessibleAccounts}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" />
                <CardTitle>{t.dashboard.workspaceMembers}</CardTitle>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/workspace/settings">
                  <Settings className="h-3.5 w-3.5" />
                  {t.dashboard.manageTeam}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.dashboard.colMember}</TableHead>
                    <TableHead>{t.dashboard.colEmail}</TableHead>
                    <TableHead>{t.dashboard.colRole}</TableHead>
                    <TableHead className="text-right">
                      {t.dashboard.colJoined}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-slate-900">
                        {member.profile?.full_name || t.common.unnamedUser}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {member.profile?.email || "—"}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {t.roles[member.role]}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-500 tabular-nums">
                        {new Date(member.created_at).toLocaleDateString(
                          dateLocale,
                          { timeZone: "UTC" }
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
      />
    </div>
  );
}
