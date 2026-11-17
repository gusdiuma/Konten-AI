"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorNotice } from "@/components/common/error-notice";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { useLocale } from "@/components/common/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import { getPublicErrorMessage } from "@/lib/errors";
import {
  canDeleteWorkspace,
  canManageMembers,
  canManageWorkspace,
  INVITABLE_ROLES,
  WORKSPACE_ROLES,
  type InvitableRole,
  type WorkspaceInvitationRecord,
  type WorkspaceMemberRecord,
  type WorkspaceRole,
  type WorkspaceWithRole,
} from "@/lib/types/workspace";

interface WorkspaceSettingsClientProps {
  locale?: Locale;
  activeWorkspace: WorkspaceWithRole | null;
  members: WorkspaceMemberRecord[];
  invitations: WorkspaceInvitationRecord[];
  currentUserId: string;
}

export function WorkspaceSettingsClient({
  activeWorkspace,
  members,
  invitations,
  currentUserId,
}: WorkspaceSettingsClientProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [wsName, setWsName] = useState(activeWorkspace?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitableRole>("designer");
  const [inviting, setInviting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingWs, setDeletingWs] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<WorkspaceMemberRecord | null>(
    null
  );
  const [removingMember, setRemovingMember] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );
  const [notice, setNotice] = useState<string | null>(null);

  if (!activeWorkspace) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-10">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              {t.settings.noWorkspaceTitle}
            </h2>
            <p className="text-sm text-slate-500">
              {t.settings.noWorkspaceDesc}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t.shell.createWorkspace}
          </Button>
          <CreateWorkspaceDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            locale={locale}
          />
        </CardContent>
      </Card>
    );
  }

  const canEdit = canManageWorkspace(activeWorkspace.role);
  const canMembers = canManageMembers(activeWorkspace.role);
  const canDelete = canDeleteWorkspace(activeWorkspace.role);
  const dateLocale = locale === "id" ? "id-ID" : "en-US";

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;
    setError(null);
    setNotice(null);
    setSavingName(true);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-WS-02";
        setError({ message: getPublicErrorMessage(code, locale), code });
        return;
      }
      setNotice(t.settings.workspaceUpdated);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setSavingName(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;
    setError(null);
    setNotice(null);
    setInviting(true);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-MBR-01";
        setError({ message: getPublicErrorMessage(code, locale), code });
        return;
      }
      setInviteEmail("");
      setInviteOpen(false);
      setNotice(
        data?.status === "added"
          ? t.settings.memberAdded
          : t.settings.invitationCreated
      );
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: InvitableRole) {
    if (!activeWorkspace) return;
    setError(null);
    setUpdatingMemberId(memberId);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-MBR-01";
        setError({ message: getPublicErrorMessage(code, locale), code });
        return;
      }
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function handleRemoveMember() {
    if (!activeWorkspace || !removeTarget) return;
    setError(null);
    setRemovingMember(true);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/members/${removeTarget.id}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error?.code ?? "ACS-MBR-01";
        setError({ message: getPublicErrorMessage(code, locale), code });
        return;
      }
      setRemoveTarget(null);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setRemovingMember(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!activeWorkspace) return;
    setError(null);
    setRevokingId(invitationId);
    try {
      const res = await fetch("/api/workspaces/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          workspaceId: activeWorkspace.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const code = data?.error?.code ?? "ACS-INV-01";
        setError({ message: getPublicErrorMessage(code, locale), code });
        return;
      }
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setRevokingId(null);
    }
  }

  async function handleDeleteWorkspace() {
    if (!activeWorkspace) return;
    setError(null);
    setDeletingWs(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const code = data?.error?.code ?? "ACS-WS-02";
        setError({ message: getPublicErrorMessage(code, locale), code });
        return;
      }
      setDeleteOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setDeletingWs(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorNotice message={error.message} code={error.code} /> : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.general}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSaveName}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="ws-settings-name">
                {t.settings.workspaceName}
              </Label>
              <Input
                id="ws-settings-name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                disabled={!canEdit || savingName}
                minLength={2}
                maxLength={80}
                required
              />
            </div>
            {canEdit ? (
              <Button
                type="submit"
                disabled={savingName || wsName.trim().length < 2}
              >
                {savingName ? t.common.saving : t.settings.saveChanges}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <CardTitle>{t.settings.membersCount(members.length)}</CardTitle>
          {canMembers ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              {t.settings.addMember}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.settings.colName}</TableHead>
                <TableHead>{t.settings.colEmail}</TableHead>
                <TableHead>{t.settings.colRole}</TableHead>
                <TableHead className="text-right">
                  {t.settings.colAction}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isOwner = member.role === "owner";
                const isSelf = member.user_id === currentUserId;
                const canChangeRole = canMembers && !isOwner;
                const canRemove = (canMembers || isSelf) && !isOwner;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium text-slate-900">
                      {member.profile?.full_name || t.common.unnamedUser}
                      {isSelf ? (
                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                          {t.common.you}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {member.profile?.email || "—"}
                    </TableCell>
                    <TableCell>
                      {canChangeRole ? (
                        <Select
                          value={member.role}
                          disabled={updatingMemberId === member.id}
                          onValueChange={(val) =>
                            handleRoleChange(member.id, val as InvitableRole)
                          }
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {t.roles[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-slate-700">
                          {t.roles[member.role]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canRemove ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setRemoveTarget(member)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">{t.common.remove}</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canMembers && invitations.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {t.settings.pendingInvitationsCount(invitations.length)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.settings.colEmail}</TableHead>
                  <TableHead>{t.settings.colRole}</TableHead>
                  <TableHead>{t.settings.colExpires}</TableHead>
                  <TableHead className="text-right">
                    {t.settings.colAction}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-slate-900">
                      {inv.email}
                    </TableCell>
                    <TableCell>{t.roles[inv.role]}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 tabular-nums">
                      {new Date(inv.expires_at).toLocaleDateString(dateLocale, {
                        timeZone: "UTC",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revokingId === inv.id}
                        onClick={() => handleRevokeInvitation(inv.id)}
                      >
                        {revokingId === inv.id
                          ? t.common.revoking
                          : t.common.revoke}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t.settings.rolePermissions}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">{t.settings.colRole}</TableHead>
                <TableHead>{t.settings.colAccessScope}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WORKSPACE_ROLES.map((role: WorkspaceRole) => (
                <TableRow key={role}>
                  <TableCell className="font-medium text-slate-900">
                    {t.roles[role]}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {t.roleCapabilities[role]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canDelete ? (
        <Card className="border-red-200">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {t.settings.deleteWorkspace}
              </div>
              <div className="text-xs text-slate-500">
                {t.settings.deleteWorkspaceDesc}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              {t.settings.deleteWorkspace}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.inviteTitle}</DialogTitle>
            <DialogDescription>{t.settings.inviteDesc}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">{t.settings.colEmail}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder={t.settings.inviteEmailPlaceholder}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">{t.settings.colRole}</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as InvitableRole)}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t.roles[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={inviting}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? t.settings.adding : t.settings.addMember}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.removeTitle}</DialogTitle>
            <DialogDescription>
              {t.settings.removeDesc(
                removeTarget?.profile?.full_name ||
                  removeTarget?.profile?.email ||
                  t.settings.thisMember,
                activeWorkspace.name
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={removingMember}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removingMember}
              onClick={handleRemoveMember}
            >
              {removingMember ? t.common.removing : t.common.remove}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t.settings.deleteTitle(activeWorkspace.name)}
            </DialogTitle>
            <DialogDescription>{t.settings.deleteDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deletingWs}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingWs}
              onClick={handleDeleteWorkspace}
            >
              {deletingWs ? t.common.deleting : t.settings.deleteWorkspace}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
