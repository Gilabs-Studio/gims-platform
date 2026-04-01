"use client";

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

import { useExportFinanceValuation } from "../hooks/use-finance-journals";

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
  const { mutateAsync: exportFile, isPending } =
    useExportFinanceValuation();

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      const blob = await exportFile({
        id: valuationRunId!,
        format,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `valuation_${valuationType}_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">{t("export_csv")}</p>
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
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">{t("export_pdf")}</p>
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
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
