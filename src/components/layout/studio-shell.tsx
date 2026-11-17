"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  User,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { ProfileDialog } from "@/components/workspace/profile-dialog";
import { LanguageToggle } from "@/components/common/language-toggle";
import { useLocale } from "@/components/common/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import type { WorkspaceWithRole } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

interface StudioShellProps {
  title?: string;
  section?: "dashboard" | "brands" | "brandNew" | "brandDetail" | "settings";
  locale?: Locale;
  userEmail: string;
  userName: string;
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  children: React.ReactNode;
}

export function StudioShell({
  title,
  section,
  userEmail,
  userName,
  workspaces,
  activeWorkspace,
  children,
}: StudioShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useLocale();
  const resolvedTitle =
    section === "dashboard"
      ? t.dashboard.title
      : section === "brands"
        ? t.brands.title
        : section === "brandNew"
          ? t.brands.newTitle
          : section === "brandDetail"
            ? title ?? t.brands.detailTitle
            : section === "settings"
              ? t.settings.title
              : title ?? t.common.brand;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const navItems = [
    { href: "/dashboard", label: t.shell.dashboard, icon: LayoutDashboard },
    { href: "/brands", label: t.shell.brands, icon: Palette },
    { href: "/workspace/settings", label: t.shell.workspace, icon: Settings },
  ];

  async function handleSelectWorkspace(workspaceId: string) {
    if (workspaceId === activeWorkspace?.id) return;
    setSwitchingId(workspaceId);
    try {
      const res = await fetch("/api/workspaces/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  const initials = (userName || userEmail || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-slate-900">
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-150 md:static md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60",
          mobileOpen ? "w-60 translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
          {!collapsed ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-slate-900 whitespace-nowrap truncate"
            >
              {t.common.brand}
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white"
              title={t.common.brand}
            >
              AC
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={
              collapsed ? t.shell.expandSidebar : t.shell.minimizeSidebar
            }
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t.shell.closeNav}
            className="inline-flex md:hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left text-sm hover:bg-slate-100 transition-colors cursor-pointer",
                  collapsed && "justify-center px-0"
                )}
                title={activeWorkspace?.name ?? t.shell.selectWorkspace}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-600" />
                  {!collapsed ? (
                    <span className="truncate font-medium text-slate-900">
                      {activeWorkspace?.name ?? t.shell.noWorkspace}
                    </span>
                  ) : null}
                </div>
                {!collapsed ? (
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{t.shell.workspaces}</DropdownMenuLabel>
              {workspaces.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-slate-500">
                  {t.shell.noWorkspacesYet}
                </div>
              ) : (
                workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    disabled={switchingId === ws.id}
                    onClick={() => handleSelectWorkspace(ws.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {ws.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.roles[ws.role]}
                      </div>
                    </div>
                    {ws.id === activeWorkspace?.id ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-700" />
                    ) : null}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 text-slate-600" />
                <span>{t.shell.createWorkspace}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 space-y-1 p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={item.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t.shell.openNav}
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-sm font-semibold text-slate-900">
              {resolvedTitle}
            </h1>
            {activeWorkspace ? (
              <span className="hidden sm:inline-block truncate text-xs text-slate-500">
                · {activeWorkspace.name}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle locale={locale} />

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.shell.newWorkspace}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t.shell.profile}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">
                    {initials}
                  </span>
                  <span className="hidden md:inline max-w-[140px] truncate text-xs font-medium text-slate-800">
                    {userName || userEmail}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {userEmail}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="h-4 w-4 text-slate-600" />
                  <span>{t.shell.profile}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.shell.signOut}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
      />
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        initialName={userName}
        email={userEmail}
        locale={locale}
      />
    </div>
  );
}
