"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useBulkApproveFinanceValuations } from "../hooks/use-finance-journals";
import type { ValuationRun } from "../types";

interface BulkApproveDialogProps {
  runs: ValuationRun[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkApproveDialog({
  runs,
  open,
  onOpenChange,
  onSuccess,
}: BulkApproveDialogProps) {
  const t = useTranslations("finance.journal");
  const { mutateAsync: bulkApprove, isPending } =
    useBulkApproveFinanceValuations();

  const handleBulkApprove = async () => {
    const runIds = runs.map((r) => r.id);

    try {
      await bulkApprove(runIds);

      toast.success(
        t("bulk_approve_success", { count: runIds.length })
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("bulk_approve_failed");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t("bulk_approve")}
          </DialogTitle>
          <DialogDescription>
            {t("bulk_approve_desc", { count: runs.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Box */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-2 text-sm font-medium">{t("approval_summary")}</h4>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("runs_selected")}:</dt>
                <dd className="font-medium">{runs.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("total_delta")}:</dt>
                <dd className="font-medium">
                  {runs
                    .reduce((sum, r) => sum + (r.total_delta || 0), 0)
                    .toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("total_debit")}:</dt>
                <dd className="font-medium">
                  {runs
                    .reduce((sum, r) => sum + (r.total_debit || 0), 0)
                    .toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Runs Table */}
          <div>
            <h4 className="mb-2 text-sm font-medium">{t("selected_runs")}</h4>
            <div className="overflow-x-auto rounded border max-h-64 overflow-y-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("period")}</TableHead>
                    <TableHead className="text-right">{t("delta")}</TableHead>
                    <TableHead className="text-center">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium capitalize">
                        {run.valuation_type}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(run.period_start).toLocaleDateString()} -{" "}
                        {new Date(run.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {run.total_delta?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {run.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3 text-xs text-blue-700">
            <p className="font-medium">{t("bulk_approve_will_lock")}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("approve")} {runs.length} {t("runs")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
