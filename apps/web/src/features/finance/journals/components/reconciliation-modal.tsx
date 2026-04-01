"use client";

import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { useValuationReconciliation } from "../hooks/use-finance-journals";

interface ReconciliationModalProps {
  valuationRunId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReconciliationDetail {
  account: string;
  gl_balance: number;
  subledger_total: number;
  delta: number;
  tolerance: number;
  within_tolerance: boolean;
}

interface ReconciliationReport {
  valuation_run_id: string;
  valuation_type: string;
  status: "matched" | "mismatched" | "no_journal";
  overall_delta: number;
  all_lines_matched: boolean;
  details: ReconciliationDetail[];
  error_message?: string;
  checked_at: string;
}

export function ReconciliationModal({
  valuationRunId,
  open,
  onOpenChange,
}: ReconciliationModalProps) {
  const t = useTranslations("finance.journal");
  const { data, isLoading, error } = useValuationReconciliation(
    valuationRunId ?? "",
    { enabled: open && !!valuationRunId }
  );

  const report = data?.data as ReconciliationReport | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("reconciliation_report")}</DialogTitle>
          <DialogDescription>
            {t("gl_vs_subledger_validation")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p>{t("reconciliation_failed")}</p>
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : t("unknown_error")}
            </p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Header Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t("status")}</h3>
                <Badge
                  variant={report.status === "matched" ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {report.status === "matched" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {report.status === "matched"
                    ? t("reconciliation_matched")
                    : t("reconciliation_mismatched")}
                </Badge>
              </div>

              {report.error_message && (
                <div className="rounded bg-red-50 p-3 text-xs text-red-700">
                  {report.error_message}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {t("checked_at")}: {new Date(report.checked_at).toLocaleString()}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("overall_delta")}
                </p>
                <p className={cn("text-lg font-semibold", 
                  report.overall_delta === 0 ? "text-green-600" : "text-orange-600"
                )}>
                  {report.overall_delta.toFixed(2)}
                </p>
              </div>

              <div className="rounded border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("reconciliation_status")}
                </p>
                <p className="text-lg font-semibold">
                  {report.all_lines_matched ? (
                    <span className="text-green-600">✓ {t("matched")}</span>
                  ) : (
                    <span className="text-red-600">✗ {t("mismatched")}</span>
                  )}
                </p>
              </div>

              <div className="rounded border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("valuation_type")}
                </p>
                <p className="text-lg font-semibold capitalize">
                  {report.valuation_type}
                </p>
              </div>
            </div>

            {/* Details Table */}
            {report.details && report.details.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium">{t("account_details")}</h4>
                <div className="overflow-x-auto rounded border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("account")}</TableHead>
                        <TableHead className="text-right">{t("gl_balance")}</TableHead>
                        <TableHead className="text-right">{t("subledger_total")}</TableHead>
                        <TableHead className="text-right">{t("delta")}</TableHead>
                        <TableHead className="text-right">{t("tolerance")}</TableHead>
                        <TableHead className="text-center">{t("status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.details.map((detail, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {detail.account}
                          </TableCell>
                          <TableCell className="text-right">
                            {detail.gl_balance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {detail.subledger_total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              detail.delta === 0 ? "text-green-600" : "text-orange-600"
                            )}>
                              {detail.delta.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {detail.tolerance.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={detail.within_tolerance ? "default" : "destructive"}
                              className="whitespace-nowrap text-xs"
                            >
                              {detail.within_tolerance ? t("pass") : t("fail")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3 text-xs text-blue-700">
              {report.status === "matched"
                ? t("reconciliation_matched_desc")
                : t("reconciliation_mismatched_desc")}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
