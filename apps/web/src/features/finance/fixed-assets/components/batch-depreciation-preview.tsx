"use client";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BatchDepreciationPreviewResponse } from "../types";
import { Loader2 } from "lucide-react";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useTranslations } from "next-intl";

type PreviewItem = NonNullable<BatchDepreciationPreviewResponse["items"]>[number];

function getPreviewLines(previewData: BatchDepreciationPreviewResponse | null): PreviewItem[] {
  return previewData?.items ?? previewData?.preview_lines ?? [];
}

function getPreviewStatus(line: PreviewItem): "new" | "already_depreciated" | "skipped" {
  if (typeof line.status === "string" && line.status.length > 0) {
    return line.status;
  }
  if (line.eligible === false || line.skip_reason) {
    return "skipped";
  }
  return "new";
}

function getPreviewBookValue(line: PreviewItem): number {
  if (typeof line.book_value === "number") {
    return line.book_value;
  }
  if (typeof line.opening_book_value === "number") {
    return line.opening_book_value;
  }
  return 0;
}

function normalizeCurrencyCode(currencyCode: string | undefined | null): string {
  const normalized = (currencyCode ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }
  return "IDR";
}

function formatCurrency(value: number | undefined | null, currencyCode?: string): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const currency = normalizeCurrencyCode(currencyCode);
  return safeValue.toLocaleString("en-US", {
    style: "currency",
    currency,
  });
}

interface BatchDepreciationPreviewProps {
  month: string;
  year: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onPreview: () => Promise<void>;
  onRun: () => Promise<void>;
  previewData: BatchDepreciationPreviewResponse | null;
  isLoadingPreview: boolean;
  isRunning: boolean;
  periodValidationError?: { type: string; message: string } | null;
}

export function BatchDepreciationPreview({
  month,
  year,
  onMonthChange,
  onYearChange,
  onPreview,
  onRun,
  previewData,
  isLoadingPreview,
  isRunning,
  periodValidationError,
}: BatchDepreciationPreviewProps) {
  const t = useTranslations("financeFixedAssets.batchDepreciation");
  const canDepreciate = useUserPermission(FINANCE_PERMISSIONS.ASSET.DEPRECIATE);
  const currentYear = new Date().getFullYear();
  const previewLines = getPreviewLines(previewData);
  const defaultCurrencyCode = normalizeCurrencyCode(previewData?.currency_code);
  const totalDepreciationAmount =
    previewData?.total_depreciation_amount ??
    previewData?.total_amount ??
    previewLines.reduce((sum, line) => sum + (typeof line.depreciation_amount === "number" ? line.depreciation_amount : 0), 0) ??
    0;
  const totalLines = previewData?.total_assets ?? previewData?.total_lines ?? previewLines.length;
  const successfulLines = previewData?.successful ?? previewData?.eligible ?? previewLines.filter((line) => line.eligible !== false && !line.skip_reason).length;
  const skippedLines = previewData?.skipped ?? previewLines.filter((line) => line.eligible === false || !!line.skip_reason).length;
  const failedLines = previewData?.failed ?? 0;

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: new Date(2000, i).toLocaleDateString(undefined, { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("period")}</CardTitle>
          <CardDescription>{t("selectPeriod")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="month" className="text-sm font-medium">{t("month")}</Label>
              <Select
                value={month}
                onValueChange={onMonthChange}
              >
                <SelectTrigger id="month" className="cursor-pointer">
                  <SelectValue placeholder={t("month")} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">{t("year")}</Label>
              <Select
                value={year}
                onValueChange={onYearChange}
              >
                <SelectTrigger id="year" className="cursor-pointer">
                  <SelectValue placeholder={t("year")} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={onPreview}
              disabled={!month || !year || isLoadingPreview || !canDepreciate}
              variant="outline"
              className="cursor-pointer"
            >
              {isLoadingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("preview")}
            </Button>
            <Button
              type="button"
              onClick={onRun}
              disabled={!previewData || isRunning || !canDepreciate}
              className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("run")}
            </Button>
          </div>

          {periodValidationError && (
            <div
              className={`p-4 rounded-lg border ${
                periodValidationError.type === "closed_period"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
              }`}
            >
              <p className="font-medium">
                {periodValidationError.type === "closed_period"
                  ? t("periodClosed")
                  : t("validationError")}
              </p>
              <p className="text-sm mt-1">{periodValidationError.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>{t("previewResults")}</CardTitle>
            <CardDescription>
              {successfulLines} / {totalLines} {t("ready")} ({skippedLines} {t("skipped")})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-muted rounded-lg text-sm">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-muted-foreground">{t("totalAmount")}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(totalDepreciationAmount, defaultCurrencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("ready")}</p>
                  <p className="text-lg font-semibold text-green-600">{successfulLines}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("skipped")}</p>
                  <p className="text-lg font-semibold text-yellow-600">{skippedLines}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("failed")}</p>
                  <p className="text-lg font-semibold text-destructive">{failedLines}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("asset")}</TableHead>
                    <TableHead>{t("method")}</TableHead>
                    <TableHead className="text-right">{t("amount")}</TableHead>
                    <TableHead className="text-right">{t("bookValue")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewLines.slice(0, 10).map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.asset_name}</p>
                          <p className="text-sm text-muted-foreground">{line.asset_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{line.method ?? "SL"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.depreciation_amount, line.currency_code ?? defaultCurrencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(getPreviewBookValue(line), line.currency_code ?? defaultCurrencyCode)}
                      </TableCell>
                      <TableCell>
                          <Badge
                            variant={
                              getPreviewStatus(line) === "new"
                                ? "info"
                                : getPreviewStatus(line) === "skipped"
                                ? "warning"
                                : "outline"
                            }
                          >
                          {getPreviewStatus(line)}
                          </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewLines.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                ... {previewLines.length - 10} {t("ready")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
