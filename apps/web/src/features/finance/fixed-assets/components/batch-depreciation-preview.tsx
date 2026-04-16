"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import type { BatchDepreciationPreviewResponse } from "../types";
import { Loader2 } from "lucide-react";

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
  const currentMonth = new Date().getMonth() + 1;

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
              <select
                id="month"
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Month</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <select
                id="year"
                value={year}
                onChange={(e) => onYearChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Year</option>
                {yearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                    {previewData.total_depreciation_amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
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
                  {previewData.preview_lines.slice(0, 10).map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.asset_name}</p>
                          <p className="text-sm text-muted-foreground">{line.asset_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{line.method}</TableCell>
                      <TableCell className="text-right">
                        {line.depreciation_amount.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.book_value.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            line.status === "new"
                              ? "bg-blue-100 text-blue-800"
                              : line.status === "skipped"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {line.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewData.preview_lines.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                ... and {previewData.preview_lines.length - 10} more assets
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
