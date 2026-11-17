"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileType,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@/components/common/error-notice";
import { useLocale } from "@/components/common/locale-provider";
import { getPublicErrorMessage, type ErrorCode } from "@/lib/errors";
import {
  ASSET_TYPES,
  BRAND_STATUSES,
  COLOR_ROLES,
  FONT_ROLES,
  REFERENCE_TYPES,
  type AssetType,
  type BrandAssetRecord,
  type BrandColorRecord,
  type BrandDetailData,
  type BrandFontRecord,
  type BrandReferenceRecord,
  type BrandStatus,
  type ColorRole,
  type FontRole,
  type ReferenceType,
} from "@/lib/types/brand";
import { validateBrandUpload } from "@/lib/validators/brand";

interface BrandDetailClientProps {
  initialData: BrandDetailData;
  canManage: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BrandDetailClient({
  initialData,
  canManage,
}: BrandDetailClientProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [brand, setBrand] = useState(initialData.brand);
  const [colors, setColors] = useState<BrandColorRecord[]>(initialData.colors);
  const [fonts, setFonts] = useState<BrandFontRecord[]>(initialData.fonts);
  const [assets, setAssets] = useState<BrandAssetRecord[]>(initialData.assets);
  const [references, setReferences] = useState<BrandReferenceRecord[]>(
    initialData.references
  );

  // Identity & Brand DNA fields
  const [name, setName] = useState(initialData.brand.name);
  const [industry, setIndustry] = useState(initialData.brand.industry);
  const [description, setDescription] = useState(initialData.brand.description);
  const [personality, setPersonality] = useState(
    initialData.guideline?.personality ?? ""
  );
  const [positioning, setPositioning] = useState(
    initialData.guideline?.positioning ?? ""
  );
  const [audience, setAudience] = useState(
    initialData.guideline?.audience ?? ""
  );
  const [tone, setTone] = useState(initialData.guideline?.tone ?? "");
  const [visualRules, setVisualRules] = useState(
    initialData.guideline?.rules_json?.visualRules ?? ""
  );
  const [forbiddenElements, setForbiddenElements] = useState(
    initialData.guideline?.rules_json?.forbiddenElements ?? ""
  );
  const [layoutPreferences, setLayoutPreferences] = useState(
    initialData.guideline?.rules_json?.layoutPreferences ?? ""
  );
  const [imageDirection, setImageDirection] = useState(
    initialData.guideline?.rules_json?.imageDirection ?? ""
  );

  // Color form
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#1D4ED8");
  const [colorRole, setColorRole] = useState<ColorRole>("accent");

  // Font form
  const [fontFamily, setFontFamily] = useState("");
  const [fontRole, setFontRole] = useState<FontRole>("heading");
  const [fontWeights, setFontWeights] = useState("400, 600, 700");
  const [fontStoragePath, setFontStoragePath] = useState<string>("none");

  // Asset upload form
  const [assetType, setAssetType] = useState<AssetType>("logo");
  const [assetAlt, setAssetAlt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Reference form
  const [refType, setRefType] = useState<ReferenceType>("liked");
  const [refAssetId, setRefAssetId] = useState<string>("none");
  const [refNotes, setRefNotes] = useState("");

  // Action states
  const [savingDna, setSavingDna] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingColor, setAddingColor] = useState(false);
  const [addingFont, setAddingFont] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [addingRef, setAddingRef] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState(false);
  const [deleteBrandOpen, setDeleteBrandOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<BrandAssetRecord | null>(
    null
  );
  const [deletingAsset, setDeletingAsset] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  function showApiError(code: ErrorCode) {
    setNotice(null);
    setError({ message: getPublicErrorMessage(code, locale), code });
  }

  async function handleStatusChange(nextStatus: BrandStatus) {
    if (!canManage || nextStatus === brand.status) return;
    setError(null);
    setNotice(null);
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showApiError((data?.error?.code as ErrorCode) ?? "ACS-BRD-02");
        return;
      }
      setBrand(data.brand);
      setNotice(t.brands.savedNotice);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveDna(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setNotice(null);
    setSavingDna(true);

    try {
      const [brandRes, dnaRes] = await Promise.all([
        fetch(`/api/brands/${brand.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            industry: industry.trim(),
            description: description.trim(),
          }),
        }),
        fetch(`/api/brands/${brand.id}/guidelines`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personality: personality.trim(),
            positioning: positioning.trim(),
            audience: audience.trim(),
            tone: tone.trim(),
            rules_json: {
              visualRules: visualRules.trim(),
              forbiddenElements: forbiddenElements.trim(),
              layoutPreferences: layoutPreferences.trim(),
              imageDirection: imageDirection.trim(),
            },
          }),
        }),
      ]);

      const brandData = await brandRes.json().catch(() => null);
      const dnaData = await dnaRes.json().catch(() => null);

      if (!brandRes.ok) {
        showApiError((brandData?.error?.code as ErrorCode) ?? "ACS-BRD-02");
        return;
      }
      if (!dnaRes.ok) {
        showApiError((dnaData?.error?.code as ErrorCode) ?? "ACS-DNA-01");
        return;
      }

      setBrand(brandData.brand);
      setNotice(t.brands.savedNotice);
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setSavingDna(false);
    }
  }

  async function handleAddColor(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setNotice(null);
    setAddingColor(true);

    try {
      const res = await fetch(`/api/brands/${brand.id}/colors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: colorName.trim(),
          hex: colorHex.trim(),
          role: colorRole,
          sort_order: colors.length,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showApiError((data?.error?.code as ErrorCode) ?? "ACS-CLR-01");
        return;
      }
      setColors((prev) => [...prev, data.color]);
      setColorName("");
      setNotice(t.brands.savedNotice);
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setAddingColor(false);
    }
  }

  async function handleDeleteColor(colorId: string) {
    if (!canManage) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/brands/${brand.id}/colors/${colorId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showApiError("ACS-CLR-01");
        return;
      }
      setColors((prev) => prev.filter((c) => c.id !== colorId));
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    }
  }

  async function handleAddFont(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setNotice(null);
    setAddingFont(true);

    const parsedWeights = fontWeights
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/brands/${brand.id}/fonts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: fontFamily.trim(),
          role: fontRole,
          storage_path: fontStoragePath === "none" ? null : fontStoragePath,
          weights_json: parsedWeights.length > 0 ? parsedWeights : ["400", "700"],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showApiError((data?.error?.code as ErrorCode) ?? "ACS-FNT-01");
        return;
      }
      setFonts((prev) => [...prev, data.font]);
      setFontFamily("");
      setFontStoragePath("none");
      setNotice(t.brands.savedNotice);
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setAddingFont(false);
    }
  }

  async function handleDeleteFont(fontId: string) {
    if (!canManage) return;
    setError(null);
    try {
      const res = await fetch(`/api/brands/${brand.id}/fonts/${fontId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showApiError("ACS-FNT-01");
        return;
      }
      setFonts((prev) => prev.filter((f) => f.id !== fontId));
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    }
  }

  async function handleUploadAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !selectedFile) return;

    const precheck = validateBrandUpload({
      fileName: selectedFile.name,
      mimeType: selectedFile.type,
      sizeBytes: selectedFile.size,
      assetType,
    });
    if (!precheck.ok) {
      showApiError("ACS-AST-01");
      return;
    }

    setError(null);
    setNotice(null);
    setUploadingAsset(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("asset_type", assetType);
      if (assetAlt.trim()) {
        formData.append("alt_text", assetAlt.trim());
      }

      const res = await fetch(`/api/brands/${brand.id}/assets`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showApiError((data?.error?.code as ErrorCode) ?? "ACS-AST-02");
        return;
      }

      setAssets((prev) => [data.asset, ...prev]);
      setSelectedFile(null);
      setAssetAlt("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setNotice(t.brands.savedNotice);
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setUploadingAsset(false);
    }
  }

  async function handleConfirmDeleteAsset() {
    if (!canManage || !assetToDelete) return;
    setError(null);
    setDeletingAsset(true);

    try {
      const res = await fetch(
        `/api/brands/${brand.id}/assets/${assetToDelete.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        showApiError("ACS-AST-02");
        return;
      }
      const deletedId = assetToDelete.id;
      setAssets((prev) => prev.filter((a) => a.id !== deletedId));
      setReferences((prev) =>
        prev.map((r) =>
          r.asset_id === deletedId ? { ...r, asset_id: null, asset: null } : r
        )
      );
      setAssetToDelete(null);
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setDeletingAsset(false);
    }
  }

  async function handleAddReference(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setNotice(null);
    setAddingRef(true);

    try {
      const res = await fetch(`/api/brands/${brand.id}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: refType,
          asset_id: refAssetId === "none" ? null : refAssetId,
          notes: refNotes.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showApiError((data?.error?.code as ErrorCode) ?? "ACS-REF-01");
        return;
      }

      setReferences((prev) => [data.reference, ...prev]);
      setRefNotes("");
      setRefAssetId("none");
      setNotice(t.brands.savedNotice);
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setAddingRef(false);
    }
  }

  async function handleDeleteReference(refId: string) {
    if (!canManage) return;
    setError(null);
    try {
      const res = await fetch(`/api/brands/${brand.id}/references/${refId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showApiError("ACS-REF-01");
        return;
      }
      setReferences((prev) => prev.filter((r) => r.id !== refId));
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    }
  }

  async function handleDeleteBrand() {
    if (!canManage) return;
    setError(null);
    setDeletingBrand(true);

    try {
      const res = await fetch(`/api/brands/${brand.id}`, { method: "DELETE" });
      if (!res.ok) {
        showApiError("ACS-BRD-02");
        return;
      }
      router.push("/brands");
      router.refresh();
    } catch {
      setError({ message: t.common.connectionFailed, code: "ACS-SYS-01" });
    } finally {
      setDeletingBrand(false);
    }
  }

  const fontAssets = assets.filter((a) => a.asset_type === "font");
  const visualAssets = assets.filter((a) => a.asset_type !== "font");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild size="sm" variant="outline">
            <Link href="/brands">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.common.back}
            </Link>
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {brand.name}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {brand.industry || "—"} · {t.brands.statuses[brand.status]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage ? (
            <>
              <Select
                value={brand.status}
                onValueChange={(val) => handleStatusChange(val as BrandStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t.brands.statuses[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setDeleteBrandOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.common.delete}
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-500">
              {t.brands.readOnlyNotice}
            </span>
          )}
        </div>
      </div>

      {error ? <ErrorNotice message={error.message} code={error.code} /> : null}
      {notice ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
          {notice}
        </div>
      ) : null}

      <Tabs defaultValue="dna">
        <TabsList>
          <TabsTrigger value="dna">{t.brands.tabDna}</TabsTrigger>
          <TabsTrigger value="palette">{t.brands.tabPalette}</TabsTrigger>
          <TabsTrigger value="assets">{t.brands.tabAssets}</TabsTrigger>
          <TabsTrigger value="references">{t.brands.tabReferences}</TabsTrigger>
        </TabsList>

        <TabsContent value="dna">
          <form onSubmit={handleSaveDna} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{t.brands.identitySection}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">{t.brands.brandName}</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canManage}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-industry">{t.brands.industry}</Label>
                  <Input
                    id="edit-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    disabled={!canManage}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-desc">{t.brands.description}</Label>
                  <Textarea
                    id="edit-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canManage}
                    maxLength={600}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{t.brands.tabDna}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-personality">
                    {t.brands.personality}
                  </Label>
                  <Input
                    id="edit-personality"
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder={t.brands.personalityPlaceholder}
                    disabled={!canManage}
                    maxLength={600}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-tone">{t.brands.tone}</Label>
                  <Input
                    id="edit-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder={t.brands.tonePlaceholder}
                    disabled={!canManage}
                    maxLength={600}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-positioning">
                    {t.brands.positioning}
                  </Label>
                  <Textarea
                    id="edit-positioning"
                    value={positioning}
                    onChange={(e) => setPositioning(e.target.value)}
                    placeholder={t.brands.positioningPlaceholder}
                    disabled={!canManage}
                    maxLength={600}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-audience">{t.brands.audience}</Label>
                  <Textarea
                    id="edit-audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder={t.brands.audiencePlaceholder}
                    disabled={!canManage}
                    maxLength={600}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-visual-rules">
                    {t.brands.visualRules}
                  </Label>
                  <Textarea
                    id="edit-visual-rules"
                    value={visualRules}
                    onChange={(e) => setVisualRules(e.target.value)}
                    placeholder={t.brands.visualRulesPlaceholder}
                    disabled={!canManage}
                    maxLength={1000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-forbidden">
                    {t.brands.forbiddenElements}
                  </Label>
                  <Textarea
                    id="edit-forbidden"
                    value={forbiddenElements}
                    onChange={(e) => setForbiddenElements(e.target.value)}
                    placeholder={t.brands.forbiddenPlaceholder}
                    disabled={!canManage}
                    maxLength={1000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-layout">
                    {t.brands.layoutPreferences}
                  </Label>
                  <Textarea
                    id="edit-layout"
                    value={layoutPreferences}
                    onChange={(e) => setLayoutPreferences(e.target.value)}
                    placeholder={t.brands.layoutPlaceholder}
                    disabled={!canManage}
                    maxLength={1000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-image-dir">
                    {t.brands.imageDirection}
                  </Label>
                  <Textarea
                    id="edit-image-dir"
                    value={imageDirection}
                    onChange={(e) => setImageDirection(e.target.value)}
                    placeholder={t.brands.imageDirectionPlaceholder}
                    disabled={!canManage}
                    maxLength={1000}
                  />
                </div>
              </CardContent>
            </Card>

            {canManage ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={savingDna}>
                  {savingDna ? t.common.saving : t.common.save}
                </Button>
              </div>
            ) : null}
          </form>
        </TabsContent>

        <TabsContent value="palette">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{t.brands.colorsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {colors.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.brands.noColors}</p>
                ) : (
                  <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {colors.map((color) => (
                      <div
                        key={color.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-7 w-7 shrink-0 rounded-md border border-slate-200"
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">
                              {color.name}
                            </div>
                            <div className="font-mono text-xs text-slate-500">
                              {color.hex} · {t.brands.colorRoles[color.role]}
                            </div>
                          </div>
                        </div>
                        {canManage ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteColor(color.id)}
                            aria-label={t.common.delete}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {canManage ? (
                  <form
                    onSubmit={handleAddColor}
                    className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="color-name">{t.brands.colorName}</Label>
                        <Input
                          id="color-name"
                          value={colorName}
                          onChange={(e) => setColorName(e.target.value)}
                          placeholder={t.brands.colorNamePlaceholder}
                          required
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t.brands.colorRole}</Label>
                        <Select
                          value={colorRole}
                          onValueChange={(v) => setColorRole(v as ColorRole)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {t.brands.colorRoles[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="color-hex">{t.brands.colorHex}</Label>
                        <Input
                          id="color-hex"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          className="font-mono"
                          maxLength={7}
                          required
                        />
                      </div>
                      <input
                        type="color"
                        aria-label={t.brands.colorHex}
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(colorHex)
                            ? colorHex
                            : "#1D4ED8"
                        }
                        onChange={(e) =>
                          setColorHex(e.target.value.toUpperCase())
                        }
                        className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                      />
                      <Button type="submit" disabled={addingColor}>
                        <Plus className="h-4 w-4" />
                        {addingColor ? t.common.adding : t.brands.addColor}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{t.brands.fontsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fonts.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.brands.noFonts}</p>
                ) : (
                  <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {fonts.map((font) => (
                      <div
                        key={font.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {font.family}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t.brands.fontRoles[font.role]} ·{" "}
                            {Array.isArray(font.weights_json)
                              ? font.weights_json.join(", ")
                              : "400"}
                            {font.storage_path ? " · WOFF/TTF" : ""}
                          </div>
                        </div>
                        {canManage ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteFont(font.id)}
                            aria-label={t.common.delete}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {canManage ? (
                  <form
                    onSubmit={handleAddFont}
                    className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="font-family">
                          {t.brands.fontFamily}
                        </Label>
                        <Input
                          id="font-family"
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          placeholder={t.brands.fontFamilyPlaceholder}
                          required
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t.brands.fontRole}</Label>
                        <Select
                          value={fontRole}
                          onValueChange={(v) => setFontRole(v as FontRole)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {t.brands.fontRoles[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="font-weights">
                          {t.brands.fontWeights}
                        </Label>
                        <Input
                          id="font-weights"
                          value={fontWeights}
                          onChange={(e) => setFontWeights(e.target.value)}
                          placeholder="400, 600, 700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t.brands.fontFileOptional}</Label>
                        <Select
                          value={fontStoragePath}
                          onValueChange={setFontStoragePath}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t.brands.noLinkedFile}
                            </SelectItem>
                            {fontAssets.map((asset) => (
                              <SelectItem
                                key={asset.id}
                                value={asset.storage_path}
                              >
                                {asset.metadata_json?.originalName ??
                                  asset.storage_path}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={addingFont}>
                        <Plus className="h-4 w-4" />
                        {addingFont ? t.common.adding : t.brands.addFont}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.brands.assetsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {canManage ? (
                <form
                  onSubmit={handleUploadAsset}
                  className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>{t.brands.assetType}</Label>
                      <Select
                        value={assetType}
                        onValueChange={(v) => setAssetType(v as AssetType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t.brands.assetTypes[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="asset-alt">{t.brands.assetAlt}</Label>
                      <Input
                        id="asset-alt"
                        value={assetAlt}
                        onChange={(e) => setAssetAlt(e.target.value)}
                        placeholder={t.brands.assetAltPlaceholder}
                        maxLength={140}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="asset-file">{t.brands.assetFile}</Label>
                      <Input
                        id="asset-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.svg,.woff2,.ttf,.otf"
                        onChange={(e) =>
                          setSelectedFile(e.target.files?.[0] ?? null)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {t.brands.assetConstraints}
                    </p>
                    <Button
                      type="submit"
                      disabled={uploadingAsset || !selectedFile}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingAsset ? t.common.uploading : t.common.upload}
                    </Button>
                  </div>
                </form>
              ) : null}

              {assets.length === 0 ? (
                <p className="text-sm text-slate-500">{t.brands.noAssets}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assets.map((asset) => {
                    const isFont = asset.asset_type === "font";
                    const title =
                      asset.metadata_json?.altText ||
                      asset.metadata_json?.originalName ||
                      asset.storage_path.split("/").pop() ||
                      asset.id;

                    return (
                      <div
                        key={asset.id}
                        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="flex h-36 items-center justify-center border-b border-slate-200 bg-slate-50">
                          {!isFont && asset.signed_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.signed_url}
                              alt={title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-contain p-2"
                            />
                          ) : isFont ? (
                            <FileType className="h-8 w-8 text-slate-400" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 p-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">
                              {title}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {t.brands.assetTypes[asset.asset_type]} ·{" "}
                              {formatBytes(asset.metadata_json?.sizeBytes)}
                            </div>
                          </div>
                          {canManage ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setAssetToDelete(asset)}
                              aria-label={t.common.delete}
                            >
                              <Trash2 className="h-4 w-4 text-slate-500" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="references">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.brands.referencesTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {canManage ? (
                <form
                  onSubmit={handleAddReference}
                  className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>{t.brands.referenceType}</Label>
                      <Select
                        value={refType}
                        onValueChange={(v) => setRefType(v as ReferenceType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REFERENCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t.brands.referenceTypes[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t.brands.linkedAsset}</Label>
                      <Select value={refAssetId} onValueChange={setRefAssetId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t.brands.noAssetLink}
                          </SelectItem>
                          {visualAssets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.metadata_json?.altText ||
                                asset.metadata_json?.originalName ||
                                asset.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ref-notes">{t.brands.referenceNotes}</Label>
                    <Textarea
                      id="ref-notes"
                      value={refNotes}
                      onChange={(e) => setRefNotes(e.target.value)}
                      placeholder={t.brands.referenceNotesPlaceholder}
                      required
                      maxLength={800}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={addingRef}>
                      <Plus className="h-4 w-4" />
                      {addingRef ? t.common.adding : t.brands.addReference}
                    </Button>
                  </div>
                </form>
              ) : null}

              {references.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t.brands.noReferences}
                </p>
              ) : (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {references.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-start justify-between gap-4 p-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {ref.asset?.signed_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ref.asset.signed_url}
                            alt={ref.notes}
                            referrerPolicy="no-referrer"
                            className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs font-medium text-slate-500">
                            {t.brands.referenceTypes[ref.reference_type]}
                            {ref.asset?.metadata_json?.originalName
                              ? ` · ${ref.asset.metadata_json.originalName}`
                              : ""}
                          </div>
                          <p className="text-sm text-slate-900">{ref.notes}</p>
                        </div>
                      </div>
                      {canManage ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteReference(ref.id)}
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteBrandOpen} onOpenChange={setDeleteBrandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.brands.deleteBrandTitle(brand.name)}</DialogTitle>
            <DialogDescription>{t.brands.deleteBrandDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteBrandOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingBrand}
              onClick={handleDeleteBrand}
            >
              {deletingBrand ? t.common.deleting : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(assetToDelete)}
        onOpenChange={(open) => {
          if (!open) setAssetToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.brands.deleteAssetTitle}</DialogTitle>
            <DialogDescription>{t.brands.deleteAssetDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssetToDelete(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingAsset}
              onClick={handleConfirmDeleteAsset}
            >
              {deletingAsset ? t.common.deleting : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
