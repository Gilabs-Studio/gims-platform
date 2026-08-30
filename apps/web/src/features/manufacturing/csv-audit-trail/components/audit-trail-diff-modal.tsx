"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCsvAuditTrailStore } from "../stores/use-csv-audit-trail-store";

export function AuditTrailDiffModal() {
  const t = useTranslations("manufacturingCsvAuditTrail");
  const { selectedRecord, setSelectedRecord } = useCsvAuditTrailStore();

  if (!selectedRecord) return null;

  return (
    <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-bold text-foreground">
              {t("detailModal.title")}
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedRecord.recordId}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {selectedRecord.formattedDate} at {selectedRecord.formattedTime} (UTC / WIB synchronized)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* User & Module Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div>
              <span className="text-muted-foreground block text-[11px]">{t("detailModal.user")}</span>
              <span className="font-medium text-foreground">{selectedRecord.user.name} {selectedRecord.user.role}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">{t("detailModal.module")}</span>
              <span className="font-medium text-foreground">{selectedRecord.moduleLabel}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">{t("detailModal.dataType")}</span>
              <span className="font-medium text-foreground">{selectedRecord.dataType}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">{t("detailModal.action")}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">{selectedRecord.action}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">{t("detailModal.source")}</span>
              <span className="font-medium text-foreground">{selectedRecord.source.replace("_", " ").toUpperCase()}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">{t("detailModal.ipAddress")}</span>
              <span className="font-mono text-foreground">{selectedRecord.ipAddress ?? "192.168.1.1"}</span>
            </div>
          </div>

          {/* Change Comparison */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Change Comparison</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[11px] text-muted-foreground block mb-1">{t("detailModal.beforeChange")}</span>
                <span className="font-medium text-foreground">{selectedRecord.beforeChange || "-"}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[11px] text-muted-foreground block mb-1">{t("detailModal.afterChange")}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedRecord.afterChange || "-"}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 rounded-lg border border-border bg-card space-y-1">
            <span className="text-[11px] text-muted-foreground block">{t("detailModal.reason")}</span>
            <p className="text-xs text-foreground font-medium">{selectedRecord.reason}</p>
          </div>

          {/* Signature Digest */}
          {selectedRecord.signatureDigest && (
            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <span className="text-[11px] text-muted-foreground block">{t("detailModal.signatureDigest")}</span>
              <p className="text-[11px] font-mono text-muted-foreground break-all">{selectedRecord.signatureDigest}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRecord(null)}
            className="cursor-pointer text-xs"
          >
            {t("detailModal.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
