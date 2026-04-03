"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useRouter,
  Link,
} from "@/i18n/routing";
import {
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  FileText,
  History,
  MoreHorizontal,
  Package,
  Paperclip,
  Pencil,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCheck,
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { Asset } from "../types";
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

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20"
        >
          {t(`status.${status}`)}
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {t(`status.${status}`)}
        </Badge>
      );
    case "sold":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-500/20">
          {t(`status.${status}`)}
        </Badge>
      );
    case "disposed":
      return (
        <Badge variant="outline" className="text-red-600 border-red-500/20">
          {t(`status.${status}`)}
        </Badge>
      );
    default:
      return <Badge variant="outline">{t(`status.${status}`)}</Badge>;
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

function getTransactionIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "acquire":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "depreciate":
      return <TrendingDown className="h-4 w-4 text-orange-500" />;
    case "dispose":
      return <Archive className="h-4 w-4 text-red-500" />;
    case "transfer":
      return <ChevronRight className="h-4 w-4 text-blue-500" />;
    case "revalue":
      return <DollarSign className="h-4 w-4 text-purple-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

/* ---------- Label-Value row helper ---------- */
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 w-48">{label}</TableCell>
      <TableCell className={mono ? "font-mono tabular-nums" : ""}>
        {value ?? "-"}
      </TableCell>
    </TableRow>
  );
}

function InfoRow2({
  label1,
  value1,
  label2,
  value2,
  mono,
}: {
  label1: string;
  value1: React.ReactNode;
  label2: string;
  value2: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 w-48">{label1}</TableCell>
      <TableCell className={mono ? "font-mono tabular-nums" : ""}>
        {value1 ?? "-"}
      </TableCell>
      <TableCell className="font-medium bg-muted/50 w-48">{label2}</TableCell>
      <TableCell className={mono ? "font-mono tabular-nums" : ""}>
        {value2 ?? "-"}
      </TableCell>
    </TableRow>
  );
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

  const canUpdate = useUserPermission("asset.update");
  const canDepreciate = useUserPermission("asset.update");

  const { data, isLoading } = useFinanceAsset(id, { enabled: !!id });
  const asset = data?.data;

  // Phase 2 hooks
  const { data: attachmentsData } = useAssetAttachments(id, { enabled: !!id });
  const { data: auditLogsData } = useAssetAuditLogs(id, { enabled: !!id });
  const { data: assignmentHistoryData } = useAssetAssignmentHistory(id, {
    enabled: !!id,
  });

  const attachments = attachmentsData?.data ?? [];
  const auditLogs = auditLogsData?.data ?? [];
  const assignmentHistory = assignmentHistoryData?.data ?? [];

  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);

  // Action dialog state
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("depreciate");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      await uploadMutation.mutateAsync({
        assetId: id,
        data: {
          file,
          file_type: "other",
          description: "",
        },
      });
    } catch {
      // error handled by mutation
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAction = (mode: ActionMode) => {
    setActionMode(mode);
    setActionOpen(true);
  };

  const handleEdit = () => {
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="cursor-pointer">
          <Link href="/finance/assets" aria-label={tCommon("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {asset.name}
            </h1>
            <Badge variant="outline" className="font-mono">
              {asset.code}
            </Badge>
            {getStatusBadge(asset.status, t)}
          </div>
          <p className="text-sm text-muted-foreground">
            {asset.category?.name ?? "-"} • {asset.location?.name ?? "-"}
          </p>
        </div>

        {asset && canUpdate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="cursor-pointer">
                {tCommon("actions")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("actions.edit")}
              </DropdownMenuItem>
              {canDepreciate && asset.status === "active" && (
                <DropdownMenuItem
                  className="cursor-pointer text-primary focus:text-primary"
                  onClick={() => handleAction("depreciate")}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  {t("actions.depreciate")}
                </DropdownMenuItem>
              )}
              {asset.status === "active" && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleAction("transfer")}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    {t("actions.transfer")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleAction("revalue")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {t("actions.revalue")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleAction("adjust")}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {t("actions.adjust")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-blue-600 focus:text-blue-600"
                    onClick={() => handleAction("sell")}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t("actions.sell")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleAction("assign")}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {t("actions.assign")}
                  </DropdownMenuItem>
                  {asset.assigned_to_employee_id && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleAction("return")}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t("actions.return")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => handleAction("dispose")}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {t("actions.dispose")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full h-auto overflow-x-auto overflow-y-hidden flex-row items-center justify-start gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 border-b mb-4">
          <TabsTrigger value="overview" className="flex-shrink-0">
            {t("detail.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="depreciations" className="flex-shrink-0">
            {t("detail.tabs.depreciations")}
            {asset.depreciations && asset.depreciations.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {asset.depreciations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-shrink-0">
            {t("detail.tabs.transactions")}
            {asset.transactions && asset.transactions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {asset.transactions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="attachments" className="flex-shrink-0">
            {t("detail.tabs.attachments")}
            {attachments.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {attachments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assignment-history" className="flex-shrink-0">
            {t("detail.tabs.assignmentHistory")}
            {assignmentHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {assignmentHistory.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit-log" className="flex-shrink-0">
            {t("detail.tabs.auditLog")}
          </TabsTrigger>
          <TabsTrigger value="acquisition" className="flex-shrink-0">
            {t("detail.tabs.acquisition")}
          </TabsTrigger>
          <TabsTrigger value="depreciation-config" className="flex-shrink-0">
            {t("detail.tabs.depreciationConfig")}
          </TabsTrigger>
          <TabsTrigger value="components" className="flex-shrink-0">
            {t("detail.tabs.components")}
            {asset.child_assets && asset.child_assets.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {asset.child_assets.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============ Overview Tab ============ */}
        <TabsContent value="overview" className="space-y-6 py-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.sections.basic")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableBody>
                    <InfoRow2
                      label1={t("fields.code")}
                      value1={<span className="font-mono">{asset.code}</span>}
                      label2={t("fields.category")}
                      value2={asset.category?.name}
                    />
                    <InfoRow2
                      label1={t("fields.location")}
                      value1={asset.location?.name}
                      label2={t("fields.status")}
                      value2={getStatusBadge(asset.status, t)}
                    />
                    {asset.description && (
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("fields.description")}
                        </TableCell>
                        <TableCell colSpan={3}>{asset.description}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Identity (serial, barcode, tag) */}
          {(asset.serial_number || asset.barcode || asset.asset_tag) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.sections.identity")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableBody>
                      {asset.serial_number && (
                        <InfoRow
                          label={t("detail.fields.serialNumber")}
                          value={
                            <span className="font-mono">{asset.serial_number}</span>
                          }
                        />
                      )}
                      {asset.barcode && (
                        <InfoRow
                          label={t("detail.fields.barcode")}
                          value={<span className="font-mono">{asset.barcode}</span>}
                        />
                      )}
                      {asset.asset_tag && (
                        <InfoRow
                          label={t("detail.fields.assetTag")}
                          value={
                            <span className="font-mono">{asset.asset_tag}</span>
                          }
                        />
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Values */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.sections.values")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableBody>
                    <InfoRow2
                      label1={t("fields.acquisitionDate")}
                      value1={formatDate(asset.acquisition_date)}
                      label2={t("fields.acquisitionCost")}
                      value2={formatCurrency(asset.acquisition_cost)}
                      mono
                    />
                    <InfoRow2
                      label1={t("fields.salvageValue")}
                      value1={formatCurrency(asset.salvage_value)}
                      label2={t("fields.accumulatedDepreciation")}
                      value2={formatCurrency(asset.accumulated_depreciation)}
                      mono
                    />
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">
                        {t("fields.bookValue")}
                      </TableCell>
                      <TableCell
                        colSpan={3}
                        className="font-mono tabular-nums font-semibold"
                      >
                        {formatCurrency(asset.book_value)}
                      </TableCell>
                    </TableRow>
                    {asset.disposed_at && (
                      <InfoRow
                        label={t("detail.fields.disposedAt")}
                        value={formatDate(asset.disposed_at)}
                      />
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          {(asset.shipping_cost > 0 ||
            asset.installation_cost > 0 ||
            asset.tax_amount > 0 ||
            asset.other_costs > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.sections.costBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableBody>
                      <InfoRow2
                        label1={t("detail.fields.shippingCost")}
                        value1={formatCurrency(asset.shipping_cost)}
                        label2={t("detail.fields.installationCost")}
                        value2={formatCurrency(asset.installation_cost)}
                        mono
                      />
                      <InfoRow2
                        label1={t("detail.fields.taxAmount")}
                        value1={formatCurrency(asset.tax_amount)}
                        label2={t("detail.fields.otherCosts")}
                        value2={formatCurrency(asset.other_costs)}
                        mono
                      />
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("detail.fields.totalCost")}
                        </TableCell>
                        <TableCell
                          colSpan={3}
                          className="font-mono tabular-nums font-semibold"
                        >
                          {formatCurrency(asset.total_cost)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Depreciation & Lifecycle */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.sections.lifecycle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableBody>
                    <InfoRow2
                      label1={t("detail.fields.lifecycleStage")}
                      value1={
                        <Badge variant="outline" className="capitalize">
                          {asset.lifecycle_stage}
                        </Badge>
                      }
                      label2={t("detail.fields.ageInMonths")}
                      value2={`${asset.age_in_months ?? 0} months`}
                    />
                    <InfoRow2
                      label1={t("detail.fields.depreciationMethod")}
                      value1={asset.depreciation_method || "-"}
                      label2={t("detail.fields.usefulLifeMonths")}
                      value2={asset.useful_life_months ?? "-"}
                    />
                    {asset.depreciation_start_date && (
                      <InfoRow
                        label={t("detail.fields.depreciationStartDate")}
                        value={formatDate(asset.depreciation_start_date)}
                      />
                    )}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">
                        {t("detail.fields.depreciationProgress")}
                      </TableCell>
                      <TableCell colSpan={3}>
                        <div className="flex items-center gap-3">
                          <Progress
                            value={asset.depreciation_progress ?? 0}
                            className="flex-1 h-2"
                          />
                          <span className="text-sm font-mono tabular-nums text-muted-foreground min-w-[3rem] text-right">
                            {(asset.depreciation_progress ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Warranty */}
          {(asset.warranty_start || asset.warranty_provider) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t("detail.sections.warranty")}
                  {asset.is_under_warranty && (
                    <Badge
                      className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20"
                      variant="outline"
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {t("detail.fields.isUnderWarranty")}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableBody>
                      <InfoRow2
                        label1={t("detail.fields.warrantyStart")}
                        value1={formatDate(asset.warranty_start)}
                        label2={t("detail.fields.warrantyEnd")}
                        value2={formatDate(asset.warranty_end)}
                      />
                      {asset.warranty_provider && (
                        <InfoRow
                          label={t("detail.fields.warrantyProvider")}
                          value={asset.warranty_provider}
                        />
                      )}
                      {asset.is_under_warranty && asset.warranty_days_remaining > 0 && (
                        <InfoRow
                          label={t("detail.fields.warrantyDaysRemaining")}
                          value={`${asset.warranty_days_remaining} days`}
                        />
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insurance */}
          {(asset.insurance_policy_number || asset.insurance_provider) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.sections.insurance")}</CardTitle>
                {asset.is_insured && (
                  <Badge
                    className="bg-blue-500/15 text-blue-700 border-blue-500/20"
                    variant="outline"
                  >
                    {t("detail.fields.isInsured")}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableBody>
                      {asset.insurance_policy_number && (
                        <InfoRow
                          label={t("detail.fields.insurancePolicyNumber")}
                          value={asset.insurance_policy_number}
                        />
                      )}
                      {asset.insurance_provider && (
                        <InfoRow
                          label={t("detail.fields.insuranceProvider")}
                          value={asset.insurance_provider}
                        />
                      )}
                      <InfoRow2
                        label1={t("detail.fields.insuranceStart")}
                        value1={formatDate(asset.insurance_start)}
                        label2={t("detail.fields.insuranceEnd")}
                        value2={formatDate(asset.insurance_end)}
                      />
                      {asset.insurance_value && (
                        <InfoRow
                          label={t("detail.fields.insuranceValue")}
                          value={formatCurrency(asset.insurance_value)}
                          mono
                        />
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>{tCommon("systemInfo")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableBody>
                    <InfoRow2
                      label1={t("detail.fields.createdAt")}
                      value1={formatDate(asset.created_at)}
                      label2={t("detail.fields.updatedAt")}
                      value2={formatDate(asset.updated_at)}
                    />
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ Depreciations Tab ============ */}
        <TabsContent value="depreciations" className="space-y-6 py-4">
          {!asset.depreciations || asset.depreciations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              {tCommon("noData")}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.depreciation.period")}</TableHead>
                    <TableHead>{t("detail.depreciation.date")}</TableHead>
                    <TableHead>{t("detail.depreciation.method")}</TableHead>
                    <TableHead className="text-right">
                      {t("detail.depreciation.amount")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("detail.depreciation.accumulated")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("detail.depreciation.bookValue")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asset.depreciations.map((dep) => (
                    <TableRow key={dep.id}>
                      <TableCell className="font-mono">{dep.period}</TableCell>
                      <TableCell>{formatDate(dep.depreciation_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {dep.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(dep.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(dep.accumulated)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(dep.book_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ============ Transactions Tab (Timeline) ============ */}
        <TabsContent value="transactions" className="space-y-6 py-4">
          {!asset.transactions || asset.transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              {tCommon("noData")}
            </div>
          ) : (
            <div className="relative space-y-0">
              {asset.transactions.map((tx, index) => (
                <div key={tx.id} className="relative flex gap-4 pb-6">
                  {index < asset.transactions!.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                  )}
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {tx.type}
                        </span>
                        <Badge
                          variant={
                            tx.status === "APPROVED"
                              ? "outline"
                              : tx.status === "CANCELLED"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            tx.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20"
                              : ""
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      {tx.amount > 0 && (
                        <span className="text-sm font-mono tabular-nums text-muted-foreground">
                          {formatCurrency(tx.amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {tx.description || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(tx.transaction_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============ Attachments Tab ============ */}
        <TabsContent value="attachments" className="space-y-4 py-4">
          {canUpdate && (
            <div className="flex justify-end">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                disabled={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadMutation.isPending ? "Uploading..." : t("detail.attachments.upload")}
              </Button>
            </div>
          )}
          {attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("detail.attachments.noAttachments")}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.attachments.fileName")}</TableHead>
                    <TableHead>{t("detail.attachments.fileType")}</TableHead>
                    <TableHead>{t("detail.attachments.fileSize")}</TableHead>
                    <TableHead>{t("detail.attachments.uploadedAt")}</TableHead>
                    <TableHead>{t("detail.attachments.description")}</TableHead>
                    <TableHead className="text-right">
                      {t("detail.attachments.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attachments.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {att.file_url ? (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate max-w-[200px] text-primary underline-offset-4 hover:underline cursor-pointer"
                              title={att.file_name}
                            >
                              {att.file_name}
                            </a>
                          ) : (
                            <span className="truncate max-w-[200px]">{att.file_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {att.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatFileSize(att.file_size)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(att.uploaded_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]">
                        {att.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {att.file_url && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 cursor-pointer"
                              asChild
                            >
                              <a
                                href={att.file_url}
                                download={att.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t("detail.attachments.download")}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          {canUpdate && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (confirm(t("detail.attachments.confirmDelete"))) {
                                  deleteMutation.mutate(
                                    {
                                      assetId: asset.id,
                                      attachmentId: att.id,
                                    },
                                    {
                                      onSuccess: () => toast.success(t("toast.done")),
                                    }
                                  );
                                }
                              }}
                              title={t("detail.attachments.delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ============ Assignment History Tab ============ */}
        <TabsContent value="assignment-history" className="space-y-4 py-4">
          {assignmentHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("detail.assignmentHistory.noHistory")}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.assignmentHistory.employee")}</TableHead>
                    <TableHead>{t("detail.assignmentHistory.assignedAt")}</TableHead>
                    <TableHead>{t("detail.assignmentHistory.returnedAt")}</TableHead>
                    <TableHead>{t("detail.assignmentHistory.status")}</TableHead>
                    <TableHead>{t("detail.assignmentHistory.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentHistory.map((ah) => (
                    <TableRow key={ah.id}>
                      <TableCell className="font-medium">
                        {ah.employee_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(ah.assigned_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(ah.returned_at)}
                      </TableCell>
                      <TableCell>
                        {ah.returned_at ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t("detail.assignmentHistory.returned")}
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20"
                            variant="outline"
                          >
                            {t("detail.assignmentHistory.active")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]">
                        {ah.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ============ Audit Log Tab ============ */}
        <TabsContent value="audit-log" className="space-y-4 py-4">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("detail.auditLog.noLogs")}
            </div>
          ) : (
            <div className="relative space-y-0">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="relative flex gap-4 pb-6">
                  {index < auditLogs.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                  )}
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="capitalize">
                        {log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.performed_at)}
                      </span>
                    </div>
                    {log.performed_by && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("detail.auditLog.performedBy")}: {log.performed_by}
                      </p>
                    )}
                    {log.changes && log.changes.length > 0 && (
                      <div className="mt-2 border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs h-7">
                                {t("detail.auditLog.field")}
                              </TableHead>
                              <TableHead className="text-xs h-7">
                                {t("detail.auditLog.oldValue")}
                              </TableHead>
                              <TableHead className="text-xs h-7">
                                {t("detail.auditLog.newValue")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {log.changes.map((change, ci) => (
                              <TableRow key={ci}>
                                <TableCell className="text-xs py-1 font-medium">
                                  {change.field}
                                </TableCell>
                                <TableCell className="text-xs py-1 text-red-600/70 line-through">
                                  {String(change.old_value ?? "-")}
                                </TableCell>
                                <TableCell className="text-xs py-1 text-emerald-600">
                                  {String(change.new_value ?? "-")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============ Acquisition Tab ============ */}
        <TabsContent value="acquisition" className="py-4">
          <AssetAcquisitionTab asset={asset} isLoading={isLoading} />
        </TabsContent>

        {/* ============ Depreciation Config Tab ============ */}
        <TabsContent value="depreciation-config" className="py-4">
          <AssetDepreciationConfigTab
            asset={asset}
            category={asset.category || undefined}
            isLoading={isLoading}
            onUpdateConfig={async () => {
              toast.success(t("toast.depreciationConfigUpdated"));
            }}
          />
        </TabsContent>

        {/* ============ Components Tab ============ */}
        <TabsContent value="components" className="py-4">
          <AssetComponentsTab
            asset={asset}
            isLoading={isLoading}
            onAddComponent={async () => {
              toast.success(t("toast.componentAdded"));
            }}
            onRemoveComponent={async () => {
              toast.success(t("toast.componentRemoved"));
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <AssetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="edit"
        initialData={asset}
      />

      {/* Action Dialogs */}
      <AssetActionsDialogs
        open={actionOpen}
        onOpenChange={setActionOpen}
        mode={actionMode}
        asset={asset}
      />
    </div>
  );
}
