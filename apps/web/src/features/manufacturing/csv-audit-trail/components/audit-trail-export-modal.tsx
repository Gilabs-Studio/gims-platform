"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ShieldCheck, CheckCircle2, FileText, Table } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCsvAuditTrailStore } from "../stores/use-csv-audit-trail-store";

export function AuditTrailExportModal() {
  const t = useTranslations("manufacturingCsvAuditTrail");
  const { isExportModalOpen, setIsExportModalOpen } = useCsvAuditTrailStore();

  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [includeHashes, setIncludeHashes] = useState<boolean>(true);

  const handleExport = () => {
    window.alert(`${t("exportModal.successMsg")} (Format: ${format.toUpperCase()})`);
    setIsExportModalOpen(false);
  };

  return (
    <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {t("exportModal.title")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("exportModal.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              {t("exportModal.formatLabel")}
            </Label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  format === "pdf"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{t("exportModal.formatPdf")}</span>
                </div>
                {format === "pdf" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  format === "csv"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Table className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{t("exportModal.formatCsv")}</span>
                </div>
                {format === "csv" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>
            </div>
          </div>

          {/* Hashes Checkbox */}
          <div className="flex items-start space-x-2 pt-2 border-t border-border">
            <Checkbox
              id="include-hashes"
              checked={includeHashes}
              onCheckedChange={(c) => setIncludeHashes(Boolean(c))}
              className="mt-0.5"
            />
            <Label htmlFor="include-hashes" className="text-xs text-muted-foreground cursor-pointer leading-tight">
              {t("exportModal.includeHashes")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(false)}
            className="cursor-pointer text-xs"
          >
            {t("exportModal.cancelBtn")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            className="cursor-pointer text-xs font-semibold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t("exportModal.exportBtn")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
