"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Download, FileText } from "lucide-react";
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
import { useExportProgress } from "@/lib/use-export-progress";

interface ExportDialogProps {
  valuationRunId: string | null;
  valuationType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  valuationRunId,
  valuationType,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const t = useTranslations("finance.journal");
  const exportProgress = useExportProgress();

  const handleExport = async (format: "csv" | "pdf") => {
    if (!valuationRunId) {
      return;
    }

    try {
      await exportProgress.runWithProgress({
        endpoint: `/finance/journal-entries/valuation/runs/${valuationRunId}/export`,
        params: { format },
      });

      toast.success(t("export_success", { format: format.toUpperCase() }));
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("export_failed");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("export_valuation")}
          </DialogTitle>
          <DialogDescription>
            {t("export_format_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* CSV Export */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleExport("csv")}
            disabled={exportProgress.isExporting}
          >
            {exportProgress.isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">{exportProgress.label(t("export_csv"))}</p>
              <p className="text-xs text-muted-foreground">
                {t("export_csv_desc")}
              </p>
            </div>
          </Button>

          {/* PDF Export */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleExport("pdf")}
            disabled={exportProgress.isExporting}
          >
            {exportProgress.isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">{exportProgress.label(t("export_pdf"))}</p>
              <p className="text-xs text-muted-foreground">
                {t("export_pdf_desc")}
              </p>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exportProgress.isExporting}
          >
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
