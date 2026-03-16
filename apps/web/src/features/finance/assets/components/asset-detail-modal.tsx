"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Pencil,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { Skeleton } from "@/components/ui/skeleton";

import type { Asset } from "../types";
import { useFinanceAsset } from "../hooks/use-finance-assets";

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

interface AssetDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  onEdit?: (asset: Asset) => void;
  onAction?: (mode: string, asset: Asset) => void;
}

export function AssetDetailModal({
  open,
  onOpenChange,
  assetId,
  onEdit,
  onAction,
}: AssetDetailModalProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const canUpdate = useUserPermission("asset.update");
  const canDepreciate = useUserPermission("asset.update");

  const { data, isLoading } = useFinanceAsset(assetId ?? "", {
    enabled: !!assetId && open,
  });
  const asset = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {isLoading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  (asset?.name ?? "-")
                )}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  {asset?.code ?? "-"}
                </Badge>
                {asset && getStatusBadge(asset.status, t)}
              </div>
            </div>
            {asset && canUpdate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => onEdit?.(asset)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("actions.edit")}
                  </DropdownMenuItem>
                  {canDepreciate && asset.status === "active" && (
                    <DropdownMenuItem
                      className="cursor-pointer text-blue-600 focus:text-blue-600"
                      onClick={() => onAction?.("depreciate", asset)}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      {t("actions.depreciate")}
                    </DropdownMenuItem>
                  )}
                  {asset.status === "active" && (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onAction?.("transfer", asset)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        {t("actions.transfer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onAction?.("revalue", asset)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        {t("actions.revalue")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onAction?.("adjust", asset)}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        {t("actions.adjust")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onAction?.("sell", asset)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        {t("actions.sell")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => onAction?.("dispose", asset)}
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
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !asset ? (
          <div className="text-center py-8 text-muted-foreground">
            {tCommon("error")}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">
                {t("detail.tabs.overview")}
              </TabsTrigger>
              <TabsTrigger value="depreciations">
                {t("detail.tabs.depreciations")}
                {asset.depreciations && asset.depreciations.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {asset.depreciations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transactions">
                {t("detail.tabs.transactions")}
                {asset.transactions && asset.transactions.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {asset.transactions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* -- Overview Tab -- */}
            <TabsContent value="overview" className="space-y-6 py-4">
              {/* Basic Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t("detail.sections.basic")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("fields.code")}
                        </TableCell>
                        <TableCell className="font-mono">
                          {asset.code}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("fields.category")}
                        </TableCell>
                        <TableCell>{asset.category?.name ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("fields.location")}
                        </TableCell>
                        <TableCell>{asset.location?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("fields.status")}
                        </TableCell>
                        <TableCell>{getStatusBadge(asset.status, t)}</TableCell>
                      </TableRow>
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
              </div>

              <Separator />

              {/* Financial Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t("detail.sections.values")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("fields.acquisitionDate")}
                        </TableCell>
                        <TableCell>
                          {formatDate(asset.acquisition_date)}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("fields.acquisitionCost")}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(asset.acquisition_cost)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("fields.salvageValue")}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(asset.salvage_value)}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("fields.accumulatedDepreciation")}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(asset.accumulated_depreciation)}
                        </TableCell>
                      </TableRow>
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
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            {t("detail.fields.disposedAt")}
                          </TableCell>
                          <TableCell colSpan={3}>
                            {formatDate(asset.disposed_at)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* System Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {tCommon("systemInfo")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("detail.fields.createdAt")}
                        </TableCell>
                        <TableCell>{formatDate(asset.created_at)}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("detail.fields.updatedAt")}
                        </TableCell>
                        <TableCell>{formatDate(asset.updated_at)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* -- Depreciations Tab -- */}
            <TabsContent value="depreciations" className="space-y-6 py-4">
              {!asset.depreciations || asset.depreciations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                  {tCommon("noData")}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
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
                          <TableCell className="font-mono">
                            {dep.period}
                          </TableCell>
                          <TableCell>
                            {formatDate(dep.depreciation_date)}
                          </TableCell>
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

            {/* -- Transactions Tab (Timeline) -- */}
            <TabsContent value="transactions" className="space-y-6 py-4">
              {!asset.transactions || asset.transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                  {tCommon("noData")}
                </div>
              ) : (
                <div className="relative space-y-0">
                  {asset.transactions.map((tx, index) => (
                    <div key={tx.id} className="relative flex gap-4 pb-6">
                      {/* Timeline line */}
                      {index < asset.transactions!.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}
                      {/* Icon */}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                        {getTransactionIcon(tx.type)}
                      </div>
                      {/* Content */}
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
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
