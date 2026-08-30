"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { PageMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { useCsvAuditTrail } from "../hooks/use-csv-audit-trail";
import { AuditTrailKpiCards } from "./audit-trail-kpi-cards";
import { AuditTrailFilterToolbar } from "./audit-trail-filter-toolbar";
import { AuditTrailTable } from "./audit-trail-table";
import { AuditTrailDiffModal } from "./audit-trail-diff-modal";
import { AuditTrailExportModal } from "./audit-trail-export-modal";

export function AuditTrailView() {
  const t = useTranslations("manufacturingCsvAuditTrail");
  const { data, kpis, totalLogs, isLoading, setIsExportModalOpen } = useCsvAuditTrail();

  return (
    <PageMotion className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>{t("exportReport")}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <AuditTrailKpiCards kpis={kpis} isLoading={isLoading} />

      {/* Filter Toolbar */}
      <AuditTrailFilterToolbar />

      {/* Main Audit Trail Log Table */}
      <AuditTrailTable records={data} totalLogs={totalLogs} />

      {/* Detail Modal */}
      <AuditTrailDiffModal />

      {/* Export Modal */}
      <AuditTrailExportModal />
    </PageMotion>
  );
}
