"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useFinanceAsset,
  useApproveFinanceAssetTransaction,
} from "../hooks/use-finance-assets";
import type { Asset, AssetDepreciation, AssetTransaction } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import { AssetActionsDialogs } from "./asset-actions-dialogs";

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString?.() ?? String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function getStatusVariant(status: Asset["status"]) {
  if (status === "active") return "success";
  if (status === "disposed") return "warning";
  return "secondary";
}

function getTxStatusVariant(status: string) {
  if (status === "APPROVED") return "success";
  if (status === "DRAFT") return "secondary";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  );
}

type ActionMode = "depreciate" | "transfer" | "dispose" | "revalue" | "adjust";

export function AssetDetail({ id }: { id: string }) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const canUpdate = useUserPermission("asset.update");
  const canApprove = useUserPermission("asset.update");

  const { data, isLoading, isError } = useFinanceAsset(id, { enabled: !!id });
  const asset = data?.data;

  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("depreciate");

  const approveMutation = useApproveFinanceAssetTransaction();

  const handleAction = (mode: ActionMode) => {
    setActionMode(mode);
    setActionOpen(true);
  };

  const depreciations = useMemo<AssetDepreciation[]>(
    () => asset?.depreciations ?? [],
    [asset?.depreciations],
  );
  const transactions = useMemo<AssetTransaction[]>(
    () => asset?.transactions ?? [],
    [asset?.transactions],
  );

  const handleApprove = async (txId: string) => {
    try {
      await approveMutation.mutateAsync(txId);
      toast.success(t("toast.done"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="text-center py-8 text-destructive">
        {tCommon("error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="cursor-pointer">
          <Link href="/finance/assets" aria-label={tCommon("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {asset.code} - {asset.name}
            </h1>
            <Badge variant={getStatusVariant(asset.status)}>
              {t(`status.${asset.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("detail.subtitle")}
          </p>
        </div>

        {canUpdate && asset.status === "active" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="cursor-pointer">
                {tCommon("actions")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleAction("depreciate")}
              >
                {t("actions.depreciate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleAction("transfer")}
              >
                {t("actions.transfer")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleAction("revalue")}
              >
                {t("actions.revalue")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleAction("adjust")}
              >
                {t("actions.adjust")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleAction("dispose")}
              >
                {t("actions.dispose")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AssetActionsDialogs
        open={actionOpen}
        onOpenChange={setActionOpen}
        mode={actionMode}
        asset={asset}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("detail.sections.basic")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label={t("fields.category")}
              value={asset.category?.name ?? "-"}
            />
            <InfoRow
              label={t("fields.location")}
              value={asset.location?.name ?? "-"}
            />
            <InfoRow
              label={t("fields.acquisitionDate")}
              value={formatDate(asset.acquisition_date)}
            />
            <InfoRow
              label={t("fields.acquisitionCost")}
              value={formatNumber(asset.acquisition_cost)}
            />
            <InfoRow
              label={t("fields.salvageValue")}
              value={formatNumber(asset.salvage_value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detail.sections.values")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label={t("fields.accumulatedDepreciation")}
              value={formatNumber(asset.accumulated_depreciation)}
            />
            <InfoRow
              label={t("fields.bookValue")}
              value={formatNumber(asset.book_value)}
            />
            <InfoRow
              label={t("detail.fields.createdAt")}
              value={formatDate(asset.created_at)}
            />
            <InfoRow
              label={t("detail.fields.updatedAt")}
              value={formatDate(asset.updated_at)}
            />
            <InfoRow
              label={t("detail.fields.disposedAt")}
              value={formatDate(asset.disposed_at ?? null)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.sections.depreciation")}</CardTitle>
        </CardHeader>
        <CardContent>
          {depreciations.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">-</div>
          ) : (
            <div className="rounded-md border">
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
                  {depreciations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.period}</TableCell>
                      <TableCell>{formatDate(d.depreciation_date)}</TableCell>
                      <TableCell>{d.method}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(d.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(d.accumulated)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(d.book_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.sections.transactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">-</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.transactions.date")}</TableHead>
                    <TableHead>{t("detail.transactions.type")}</TableHead>
                    <TableHead>{t("detail.transactions.amount")}</TableHead>
                    <TableHead>{t("detail.transactions.status")}</TableHead>
                    <TableHead>
                      {t("detail.transactions.description")}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell>{formatDate(tr.transaction_date)}</TableCell>
                      <TableCell>{tr.type}</TableCell>
                      <TableCell>{formatNumber(tr.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getTxStatusVariant(tr.status)}>
                          {tr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {tr.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {tr.status === "DRAFT" && canApprove && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary cursor-pointer"
                            onClick={() => handleApprove(tr.id)}
                            disabled={approveMutation.isPending}
                          >
                            {tCommon("approve")}
                          </Button>
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
    </div>
  );
}
