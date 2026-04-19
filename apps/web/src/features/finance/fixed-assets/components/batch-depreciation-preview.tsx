"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import type { BatchDepreciationPreviewResponse } from "../types";
import { Loader2 } from "lucide-react";

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
}: BatchDepreciationPreviewProps) {
  const t = useTranslations("financeFixedAssets");
  const currentYear = new Date().getFullYear();
  const previewLines = previewData?.preview_lines ?? [];
  const defaultCurrencyCode = normalizeCurrencyCode(previewData?.currency_code);
  const totalDepreciationAmount =
    previewData?.total_depreciation_amount ??
    (previewData as (BatchDepreciationPreviewResponse & { total_amount?: number }) | null)?.total_amount ??
    0;

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: new Date(2000, i).toLocaleDateString("en-US", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Period</CardTitle>
          <CardDescription>Select the month and year for batch depreciation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select
                value={month}
                onValueChange={onMonthChange}
              >
                <SelectTrigger id="month" className="cursor-pointer">
                  <SelectValue placeholder="Select Month" />
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
            <div>
              <Label htmlFor="year">Year</Label>
              <Select
                value={year}
                onValueChange={onYearChange}
              >
                <SelectTrigger id="year" className="cursor-pointer">
                  <SelectValue placeholder="Select Year" />
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

          <div className="flex gap-2">
            <Button
              onClick={onPreview}
              disabled={!month || !year || isLoadingPreview}
              variant="outline"
            >
              {isLoadingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Preview
            </Button>
            <Button
              onClick={onRun}
              disabled={!previewData || isRunning}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Depreciation
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Results</CardTitle>
            <CardDescription>
              {previewData.successful} of {previewData.total_lines} assets ready for depreciation ({previewData.skipped} skipped)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-muted rounded-lg text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(totalDepreciationAmount, defaultCurrencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Successful</p>
                  <p className="text-lg font-semibold">{previewData.successful}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="text-lg font-semibold text-destructive">{previewData.failed}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Book Value</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell>{line.method}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.depreciation_amount, line.currency_code ?? defaultCurrencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.book_value, line.currency_code ?? defaultCurrencyCode)}
                      </TableCell>
                      <TableCell>
                          <Badge
                            variant={
                              line.status === "new"
                                ? "info"
                                : line.status === "skipped"
                                ? "warning"
                                : "outline"
                            }
                          >
                          {line.status}
                          </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewLines.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                ... and {previewLines.length - 10} more assets
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
