"use client";

import React, { useRef, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, addMonths } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Download,
  FileText,
  History,
  Paperclip,
  Pencil,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  UserCheck,
  Building2,
  MapPin,
  User,
  QrCode,
  Printer,
  Sparkles,
  ImageIcon,
  Loader2,
  Calendar,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";
import { compressImageToWebP } from "@/lib/image-optimizer";
import { apiClient } from "@/lib/api-client";

import {
  useFinanceAsset,
  useAssetAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  useAssetAuditLogs,
  useAssetAssignmentHistory,
} from "../hooks/use-finance-assets";
import { AssetActionsDialogs } from "./asset-actions-dialogs";
import { AssetForm } from "./asset-form";

// Tab Components
import { AssetAcquisitionTab } from "./asset-tabs/asset-acquisition-tab";
import { AssetDepreciationConfigTab } from "./asset-tabs/asset-depreciation-config-tab";
import { AssetComponentsTab } from "./asset-tabs/asset-components-tab";
import { TransfersList } from "./transfers-list";

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "active":
    case "in_use":
      return (
        <Badge
          variant="outline"
          className="bg-success/15 text-success hover:bg-success/25 border-success/20 font-medium"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${status}`) || status}
        </Badge>
      );
    case "under_maintenance":
    case "idle":
      return (
        <Badge variant="outline" className="bg-warning/15 text-warning border-warning/20 font-medium">
          {t(`status.${status}`) || status}
        </Badge>
      );
    case "disposed":
    case "written_off":
      return (
        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/20 font-medium">
          {t(`status.${status}`) || status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{t(`status.${status}`) || status}</Badge>;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "PPP");
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

type ActionMode =
  | "depreciate"
  | "transfer"
  | "dispose"
  | "sell"
  | "revalue"
  | "adjust"
  | "assign"
  | "return";

interface AssetDetailPageProps {
  id: string;
}

export function AssetDetailPage({ id }: AssetDetailPageProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const canUpdate = useUserPermission(FINANCE_PERMISSIONS.ASSET.UPDATE);
  const canDepreciate = useUserPermission(FINANCE_PERMISSIONS.ASSET.DEPRECIATE);

  const [activeTab, setActiveTab] = useState<string>("overview");

  // Primary Asset Data (Fast initial load)
  const { data, isLoading, refetch } = useFinanceAsset(id, { enabled: !!id });
  const asset = data?.data;

  // Lazy-loaded Tab Data
  const { data: attachmentsData, isLoading: isLoadingAttachments } = useAssetAttachments(id, {
    enabled: !!id && activeTab === "attachments",
  });
  const { data: auditLogsData, isLoading: isLoadingAuditLogs } = useAssetAuditLogs(id, {
    enabled: !!id && activeTab === "audit-log",
  });
  const { data: assignmentHistoryData, isLoading: isLoadingAssignments } = useAssetAssignmentHistory(id, {
    enabled: !!id && activeTab === "assignment-history",
  });

  const attachments = attachmentsData?.data ?? [];
  const auditLogs = auditLogsData?.data ?? [];
  const assignmentHistory = assignmentHistoryData?.data ?? [];

  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form & Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("depreciate");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Compute Depreciation Trajectory / Forecast Schedule
  const depreciationTrajectory = useMemo(() => {
    if (!asset) return [];
    const cost = asset.acquisition_cost || 0;
    const salvage = asset.salvage_value || 0;
    const months = asset.useful_life_months || 60;
    const depreciableAmount = Math.max(0, cost - salvage);
    const monthlyDepreciation = months > 0 ? depreciableAmount / months : 0;
    const startDate = asset.acquisition_date ? new Date(asset.acquisition_date) : new Date();

    const trajectory = [];
    let accum = 0;

    for (let i = 1; i <= months; i++) {
      accum += monthlyDepreciation;
      const currentBookValue = Math.max(salvage, cost - accum);
      const periodDate = addMonths(startDate, i);
      const isPastOrCurrent = periodDate.getTime() <= new Date().getTime();

      trajectory.push({
        periodMonth: i,
        periodStr: format(periodDate, "yyyy-MM"),
        dateStr: format(periodDate, "yyyy-MM-dd"),
        method: asset.depreciation_method || "SL",
        monthlyExpense: monthlyDepreciation,
        accumulated: Math.min(depreciableAmount, accum),
        bookValue: currentBookValue,
        isPosted: isPastOrCurrent,
      });
    }

    return trajectory;
  }, [asset]);

  // Photo Upload with WebP Optimization & Cloudflare R2
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploadingPhoto(true);
    try {
      // 1. Convert to WebP client-side
      const webpFile = await compressImageToWebP(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
      });

      // 2. Upload to Cloudflare R2
      const formData = new FormData();
      formData.append("file", webpFile);

      const uploadRes = await apiClient.post("/upload/image?folder=fixed-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadedUrl = uploadRes.data?.data?.url ?? uploadRes.data?.url;
      if (uploadedUrl) {
        // Attach to asset record
        await apiClient.put(`/finance/fixed-assets/assets/${id}`, {
          image_url: uploadedUrl,
        });
        toast.success("Asset photo uploaded to Cloudflare R2!");
        await refetch();
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleAction = (mode: ActionMode) => {
    setActionMode(mode);
    setActionOpen(true);
  };

  const handlePrintSticker = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <PageMotion className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </PageMotion>
    );
  }

  if (!asset) {
    return (
      <PageMotion className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assets
        </Button>
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">{tCommon("error")}</p>
        </div>
      </PageMotion>
    );
  }

  const primaryPhoto = asset.image_url;

  return (
    <PageMotion className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b pb-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/finance/assets")}
            className="cursor-pointer mt-0.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {asset.code}
              </Badge>
              {getStatusBadge(asset.status, t)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Category: <span className="font-medium text-foreground">{asset.category?.name || "-"}</span> • Location:{" "}
              <span className="font-medium text-foreground">{asset.location?.name || "-"}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintSticker}
            className="cursor-pointer gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Tag / Sticker
          </Button>

          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormOpen(true)}
              className="cursor-pointer gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit Asset
            </Button>
          )}

          {canUpdate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="cursor-pointer gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Asset Actions
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canDepreciate && asset.status === "active" && (
                  <DropdownMenuItem
                    className="cursor-pointer text-primary focus:text-primary"
                    onClick={() => handleAction("depreciate")}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Depreciate
                  </DropdownMenuItem>
                )}
                {asset.status === "active" && (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction("transfer")}>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer Location
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction("revalue")}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Revalue Asset
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction("adjust")}>
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Adjust Book Value
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleAction("sell")}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Sell Asset
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction("assign")}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Assign Custodian
                    </DropdownMenuItem>
                    {asset.assigned_to_employee_id && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction("return")}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Return Asset
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => handleAction("dispose")}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Dispose Asset
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Hero Section: Pure Photo Side-by-Side with 2x2 Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left (5 cols): Pure Asset Photo or Sleek Interactive Dropzone */}
        <div className="md:col-span-5 flex flex-col justify-center">
          {primaryPhoto ? (
            <div className="group relative rounded-xl overflow-hidden shadow-sm aspect-4/3 max-h-[320px] bg-black/5 flex items-center justify-center">
              <img
                src={primaryPhoto}
                alt={asset.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {canUpdate && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <input
                    type="file"
                    id="hero-photo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                  <label htmlFor="hero-photo-upload">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer gap-2"
                      disabled={isUploadingPhoto}
                      onClick={() => document.getElementById("hero-photo-upload")?.click()}
                    >
                      {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      Change Photo
                    </Button>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-primary/30 p-8 text-center bg-primary/5 hover:bg-primary/10 transition-colors aspect-4/3 max-h-[320px] flex flex-col items-center justify-center space-y-3">
              <input
                type="file"
                id="hero-photo-upload-empty"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
              />
              <label htmlFor="hero-photo-upload-empty" className="cursor-pointer space-y-2 block">
                {isUploadingPhoto ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm font-medium">Optimizing WebP & Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No Asset Photo Uploaded</p>
                      <p className="text-xs text-muted-foreground">Click here to upload photo (Auto WebP Cloudflare R2)</p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Right (7 cols): 2x2 KPI Metrics Grid */}
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acquisition Cost
              </span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight">
                {formatCurrency(asset.acquisition_cost)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Purchased: {formatDate(asset.acquisition_date)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Net Book Value
              </span>
              <Sparkles className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-success">
                {formatCurrency(asset.book_value)}
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Depreciation Progress</span>
                  <span>{(asset.depreciation_progress ?? 0).toFixed(1)}%</span>
                </div>
                <Progress value={asset.depreciation_progress ?? 0} className="h-1.5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Accumulated Deprec.
              </span>
              <TrendingDown className="h-4 w-4 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-warning">
                {formatCurrency(asset.accumulated_depreciation)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Method: {asset.depreciation_method || "SL"} • {asset.useful_life_months || 60}m
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Salvage / Useful Life
              </span>
              <ShieldCheck className="h-4 w-4 text-purple" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight">
                {formatCurrency(asset.salvage_value)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Age: {asset.age_in_months ?? 0} months
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2/3 + 1/3 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Feature Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full h-auto overflow-x-auto overflow-y-hidden flex-row items-center justify-start gap-1 pb-1 border-b mb-4">
              <TabsTrigger value="overview">{t("detail.tabs.overview")}</TabsTrigger>
              <TabsTrigger value="depreciations">
                Depreciation Trajectory
              </TabsTrigger>
              <TabsTrigger value="transactions">
                {t("detail.tabs.transactions")}
                {asset.transactions && asset.transactions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {asset.transactions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="transfers">Transfers</TabsTrigger>
              <TabsTrigger value="assignment-history">Assignments</TabsTrigger>
              <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 pt-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("detail.sections.basic")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Code</span>
                      <span className="font-mono font-medium">{asset.code}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Category</span>
                      <span className="font-medium">{asset.category?.name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Location</span>
                      <span className="font-medium">{asset.location?.name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Asset Type</span>
                      <span className="font-medium">{asset.asset_type_id || "FIXED"}</span>
                    </div>
                    {asset.description && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground block">Description</span>
                        <span>{asset.description}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cost Breakdown & Financials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Acquisition Date</span>
                      <span className="font-medium">{formatDate(asset.acquisition_date)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Shipping Cost</span>
                      <span className="font-mono">{formatCurrency(asset.shipping_cost)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Installation Cost</span>
                      <span className="font-mono">{formatCurrency(asset.installation_cost)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Tax Amount</span>
                      <span className="font-mono">{formatCurrency(asset.tax_amount)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Other Costs</span>
                      <span className="font-mono">{formatCurrency(asset.other_costs)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Total Cost</span>
                      <span className="font-mono font-bold text-primary">{formatCurrency(asset.total_cost || asset.acquisition_cost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Depreciation Trajectory & Forecast Tab */}
            <TabsContent value="depreciations" className="pt-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Depreciation Schedule & Trajectory Projection</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      Method: {asset.depreciation_method || "SL"} • {asset.useful_life_months || 60} months
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {depreciationTrajectory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No depreciation trajectory schedule generated.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <span>Trajectory Progression</span>
                          <span>{asset.age_in_months ?? 0} / {asset.useful_life_months ?? 60} Months Elapsed</span>
                        </div>
                        <Progress
                          value={Math.min(100, (((asset.age_in_months ?? 0) / (asset.useful_life_months ?? 60)) * 100))}
                          className="h-2"
                        />
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month #</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Monthly Expense</TableHead>
                            <TableHead className="text-right">Accumulated</TableHead>
                            <TableHead className="text-right">Projected Book Value</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {depreciationTrajectory.map((row) => (
                            <TableRow key={row.periodMonth}>
                              <TableCell className="font-mono text-xs">M{row.periodMonth}</TableCell>
                              <TableCell className="font-mono text-xs">{row.periodStr}</TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-xs">
                                {formatCurrency(row.monthlyExpense)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-xs">
                                {formatCurrency(row.accumulated)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-xs font-semibold">
                                {formatCurrency(row.bookValue)}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.isPosted ? (
                                  <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                    Posted / Elapsed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                                    Projected
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="pt-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Transaction & Lifecycle History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!asset.transactions || asset.transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No transactions recorded.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {asset.transactions.map((tx) => (
                        <div key={tx.id} className="flex gap-4 p-3 rounded-lg border bg-card">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold capitalize text-sm">{tx.type}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatDate(tx.transaction_date)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{tx.description || "-"}</p>
                            {tx.amount > 0 && (
                              <div className="text-xs font-mono font-medium mt-1">
                                Amount: {formatCurrency(tx.amount)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attachments Tab (Lazy-loaded) */}
            <TabsContent value="attachments" className="pt-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Files & Documents</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </CardHeader>
                <CardContent>
                  {isLoadingAttachments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No documents attached.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attachments.map((att) => (
                          <TableRow key={att.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                <a
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {att.file_name}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs uppercase">
                                {att.file_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatFileSize(att.file_size)}
                            </TableCell>
                            <TableCell className="text-xs">{formatDate(att.uploaded_at)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="ghost" asChild className="h-7 w-7 cursor-pointer">
                                <a href={att.file_url} target="_blank" download>
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transfers Tab */}
            <TabsContent value="transfers" className="pt-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Location Transfers</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransfersList assetId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignment History Tab (Lazy-loaded) */}
            <TabsContent value="assignment-history" className="pt-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Custodian Assignment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAssignments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : assignmentHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No assignment history found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead>Returned Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignmentHistory.map((ah) => (
                          <TableRow key={ah.id}>
                            <TableCell className="font-medium">{ah.employee_name || "-"}</TableCell>
                            <TableCell>{formatDate(ah.assigned_at)}</TableCell>
                            <TableCell>{formatDate(ah.returned_at)}</TableCell>
                            <TableCell>
                              {ah.returned_at ? (
                                <Badge variant="outline">Returned</Badge>
                              ) : (
                                <Badge variant="success">Active Custodian</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audit Log Tab (Lazy-loaded, GIMS Standard) */}
            <TabsContent value="audit-log" className="pt-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">System Audit Trail & History</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAuditLogs ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No audit log entries found.
                    </div>
                  ) : (
                    <div className="relative space-y-0">
                      {auditLogs.map((log, index) => (
                        <div key={log.id} className="relative flex gap-4 pb-6">
                          {index < auditLogs.length - 1 && (
                            <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                          )}
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-primary">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className="capitalize font-semibold text-xs">
                                {log.action}
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                {formatDate(log.performed_at)}
                              </span>
                            </div>
                            {(log.performed_by_name || log.performed_by_user?.name || log.performed_by) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Performed By: <span className="font-medium text-foreground">{log.performed_by_name || log.performed_by_user?.name || log.performed_by}</span>
                              </p>
                            )}
                            {log.changes && log.changes.length > 0 ? (
                              <div className="mt-2.5 border rounded-md overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/30">
                                      <TableHead className="text-xs h-7">Field</TableHead>
                                      <TableHead className="text-xs h-7">Old Value</TableHead>
                                      <TableHead className="text-xs h-7">New Value</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {log.changes.map((change, ci) => (
                                      <TableRow key={ci}>
                                        <TableCell className="text-xs py-1.5 font-medium capitalize">
                                          {change.field.replace(/_/g, " ")}
                                        </TableCell>
                                        <TableCell className="text-xs py-1.5 text-destructive/80 font-mono line-through">
                                          {String(change.old_value ?? "-")}
                                        </TableCell>
                                        <TableCell className="text-xs py-1.5 text-success font-mono font-medium">
                                          {String(change.new_value ?? "-")}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : log.metadata ? (
                              <div className="mt-2 text-xs bg-muted/40 p-2.5 rounded-md font-mono space-y-1">
                                {Object.entries(log.metadata).map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span>
                                    <span>{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (1/3 Sidebar): Printable Barcode Tag & Info Cards */}
        <div className="space-y-6">
          {/* Printable Barcode / QR Tag Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Asset Tag & Barcode</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={handlePrintSticker} className="cursor-pointer h-8 px-2">
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Sticker Visual Box */}
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center space-y-3">
              <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                GIMS ASSET TAG
              </div>
              <div className="font-mono text-lg font-bold">{asset.code}</div>

              {/* Barcode Simulation */}
              <div className="flex items-center justify-center gap-1 h-12 bg-white p-2 rounded-md border">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full bg-black"
                    style={{ width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "1px" : "2px" }}
                  />
                ))}
              </div>

              <div className="text-[11px] text-muted-foreground truncate">{asset.name}</div>
            </div>
          </div>

          {/* Location & Organization Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold border-b pb-2 uppercase tracking-wider text-muted-foreground">
              Assignment Details
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="font-medium">{asset.location?.name || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">Department</div>
                  <div className="font-medium">{asset.dept_name || asset.department?.name || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">Custodian Employee</div>
                  <div className="font-medium">
                    {asset.custodian_user?.name || asset.assigned_to_employee_id || "Unassigned"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      <AssetForm open={formOpen} onOpenChange={setFormOpen} mode="edit" initialData={asset} />

      {/* Action Dialogs */}
      <AssetActionsDialogs open={actionOpen} onOpenChange={setActionOpen} mode={actionMode} asset={asset} />
    </PageMotion>
  );
}
