"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, FolderKanban, Palette, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { useLocale } from "@/components/common/locale-provider";
import {
  PROJECT_STATUSES,
  type ProjectRecord,
  type ProjectStatus,
} from "@/lib/types/project";
import {
  canManageProjects,
  type WorkspaceWithRole,
} from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

interface ProjectsListClientProps {
  activeWorkspace: WorkspaceWithRole | null;
  projects: ProjectRecord[];
  hasBrands: boolean;
}

export function ProjectsListClient({
  activeWorkspace,
  projects,
  hasBrands,
}: ProjectsListClientProps) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>(
    "all"
  );
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  const canManage = canManageProjects(activeWorkspace?.role ?? null);
  const dateLocale = locale === "id" ? "id-ID" : "en-US";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [projects, query, statusFilter]);

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Building2 className="h-5 w-5 text-slate-700" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                {t.settings.noWorkspaceTitle}
              </h2>
              <p className="text-sm text-slate-500">
                {t.projects.noWorkspaceDesc}
              </p>
            </div>
            <Button onClick={() => setCreateWorkspaceOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.shell.createWorkspace}
            </Button>
          </CardContent>
        </Card>
        <CreateWorkspaceDialog
          open={createWorkspaceOpen}
          onOpenChange={setCreateWorkspaceOpen}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.projects.searchPlaceholder}
              className="pl-9"
              aria-label={t.common.search}
            />
          </div>

          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                statusFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.common.all}
            </button>
            {PROJECT_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {t.projects.statuses[status]}
              </button>
            ))}
          </div>
        </div>

        {canManage && hasBrands ? (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              {t.projects.newProject}
            </Link>
          </Button>
        ) : null}
      </div>

      {projects.length === 0 ? (
        !hasBrands ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 py-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <Palette className="h-5 w-5 text-slate-700" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  {t.projects.needBrandTitle}
                </h2>
                <p className="text-sm text-slate-500">
                  {t.projects.needBrandDesc}
                </p>
              </div>
              <Button asChild>
                <Link href="/brands/new">
                  <Plus className="h-4 w-4" />
                  {t.projects.goToBrands}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 py-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <FolderKanban className="h-5 w-5 text-slate-700" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  {t.projects.emptyTitle}
                </h2>
                <p className="text-sm text-slate-500">
                  {t.projects.emptyDesc}
                </p>
              </div>
              {canManage ? (
                <Button asChild>
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4" />
                    {t.projects.newProject}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            {t.projects.noMatches}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.projects.colProject}</TableHead>
                  <TableHead>{t.projects.colBrand}</TableHead>
                  <TableHead>{t.projects.colType}</TableHead>
                  <TableHead className="text-right">
                    {t.projects.colSlides}
                  </TableHead>
                  <TableHead>{t.projects.colStatus}</TableHead>
                  <TableHead className="text-right">
                    {t.projects.colUpdated}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.settings.colAction}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium text-slate-900">
                      <Link
                        href={`/projects/${project.id}/generate`}
                        className="hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {project.brand?.name || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {project.brief?.content_type
                        ? t.projects.contentTypes[project.brief.content_type]
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-600 tabular-nums">
                      {project.brief?.slide_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {t.projects.statuses[project.status]}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-500 tabular-nums">
                      {new Date(project.updated_at).toLocaleDateString(
                        dateLocale,
                        { timeZone: "UTC" }
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${project.id}/generate`}>
                          {t.common.open}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
