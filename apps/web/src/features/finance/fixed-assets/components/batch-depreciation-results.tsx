"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, AlertCircle } from "lucide-react";
import type { BatchDepreciationRunResponse } from "../types";

interface BatchDepreciationResultsProps {
  data: BatchDepreciationRunResponse;
}

type LegacyRunItem = {
  journal_entry_id?: string | null;
  status?: string;
  reason?: string;
  amount?: number;
  currency_code?: string;
};

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

export function BatchDepreciationResults({ data }: BatchDepreciationResultsProps) {
  const normalized = data as BatchDepreciationRunResponse & {
    processed?: number;
    posted?: number;
    items?: LegacyRunItem[];
    journal_ids?: string[];
    errors?: string[];
    total_amount?: number;
  };

  const items = normalized.items ?? [];
  const defaultCurrencyCode = normalizeCurrencyCode(normalized.currency_code);
  const totalAssets = normalized.total_assets ?? normalized.processed ?? 0;
  const successful = normalized.successful ?? normalized.posted ?? 0;
  const failed = normalized.failed ?? 0;
  const totalAmount =
    normalized.total_amount ??
    items.reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);
  const journalIDs =
    normalized.journal_ids ??
    items
      .map((item) => item.journal_entry_id)
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  const errors =
    normalized.errors ??
    items
      .filter((item) => (item.status ?? "").toLowerCase() === "failed" && !!item.reason)
      .map((item) => item.reason as string);

  return (
    <div className="space-y-4">
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>Batch Depreciation Completed</CardTitle>
              <CardDescription>Successfully processed all selected assets</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold">{totalAssets}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{successful}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-destructive">{failed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalAmount, defaultCurrencyCode)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries Created</CardTitle>
          <CardDescription>{journalIDs.length} entries posted to general ledger</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {journalIDs.map((id, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 cursor-pointer">
                <span className="font-mono text-sm">{id}</span>
                <span className="text-xs text-muted-foreground">Journal Entry</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Errors</CardTitle>
                <CardDescription>{errors.length} errors encountered</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {errors.map((error, idx) => (
                <div key={idx} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
