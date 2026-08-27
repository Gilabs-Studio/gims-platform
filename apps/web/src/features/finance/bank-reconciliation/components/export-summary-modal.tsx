"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportSummaryModal({ isOpen, onClose }: ExportSummaryModalProps) {
  const t = useTranslations("financeBankReconciliation");
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");

  const handleExport = () => {
    // Generate/trigger file download simulation
    const dummyContent = "Bank Reconciliation Summary Report\nGenerated on " + new Date().toISOString();
    const blob = new Blob([dummyContent], { type: format === "pdf" ? "application/pdf" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bank_Reconciliation_Summary.${format === "pdf" ? "pdf" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t("exportSummary")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Download executive summary report for this reconciliation period.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          <button
            type="button"
            onClick={() => setFormat("pdf")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
              format === "pdf"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-accent text-muted-foreground"
            }`}
          >
            <FileText className="h-8 w-8 mb-2" />
            <span className="text-xs font-semibold">PDF Document</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("excel")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
              format === "excel"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-accent text-muted-foreground"
            }`}
          >
            <FileSpreadsheet className="h-8 w-8 mb-2" />
            <span className="text-xs font-semibold">Excel Spreadsheet</span>
          </button>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            {t("actions.close")}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="cursor-pointer bg-primary text-primary-foreground text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t("actions.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
