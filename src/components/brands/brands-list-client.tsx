"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Palette, Plus, Search } from "lucide-react";
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
import type { BrandRecord, BrandStatus } from "@/lib/types/brand";
import { BRAND_STATUSES } from "@/lib/types/brand";
import { canManageBrands, type WorkspaceWithRole } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

interface BrandsListClientProps {
  activeWorkspace: WorkspaceWithRole | null;
  brands: BrandRecord[];
}

export function BrandsListClient({
  activeWorkspace,
  brands,
}: BrandsListClientProps) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BrandStatus>("all");
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  const canManage = canManageBrands(activeWorkspace?.role ?? null);
  const dateLocale = locale === "id" ? "id-ID" : "en-US";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.industry.toLowerCase().includes(q)
      );
    });
  }, [brands, query, statusFilter]);

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
                {t.brands.noWorkspaceDesc}
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
              placeholder={t.brands.searchPlaceholder}
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
            {BRAND_STATUSES.map((status) => (
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
                {t.brands.statuses[status]}
              </button>
            ))}
          </div>
        </div>

        {canManage ? (
          <Button asChild>
            <Link href="/brands/new">
              <Plus className="h-4 w-4" />
              {t.brands.newBrand}
            </Link>
          </Button>
        ) : null}
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Palette className="h-5 w-5 text-slate-700" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                {t.brands.emptyTitle}
              </h2>
              <p className="text-sm text-slate-500">{t.brands.emptyDesc}</p>
            </div>
            {canManage ? (
              <Button asChild>
                <Link href="/brands/new">
                  <Plus className="h-4 w-4" />
                  {t.brands.newBrand}
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            {t.brands.noMatches}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.brands.colBrand}</TableHead>
                  <TableHead>{t.brands.colIndustry}</TableHead>
                  <TableHead>{t.brands.colStatus}</TableHead>
                  <TableHead className="text-right">
                    {t.brands.colUpdated}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.settings.colAction}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium text-slate-900">
                      <Link
                        href={`/brands/${brand.id}`}
                        className="hover:underline"
                      >
                        {brand.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {brand.industry || "—"}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {t.brands.statuses[brand.status]}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-500 tabular-nums">
                      {new Date(brand.updated_at).toLocaleDateString(
                        dateLocale,
                        { timeZone: "UTC" }
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/brands/${brand.id}`}>
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
