"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { PageMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { useCsvValidation } from "../hooks/use-csv-validation";
import { SystemValidationKpiCards } from "./system-validation-kpi-cards";
import { SystemValidationFilters } from "./system-validation-filters";
import { SystemValidationTable } from "./system-validation-table";
import { SystemValidationDetailModal } from "./system-validation-detail-modal";

export function SystemValidationView() {
  const t = useTranslations("manufacturingCsvValidation");
  const { data, isLoading } = useCsvValidation();

  const handleExport = () => {
    window.alert(t("exportReport"));
  };

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
            onClick={handleExport}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>{t("exportReport")}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <SystemValidationKpiCards kpis={data?.kpis} isLoading={isLoading} />

      {/* Filter Toolbar */}
      <SystemValidationFilters />

      {/* Table */}
      <SystemValidationTable logs={data?.logs ?? []} totalLogs={data?.totalLogs ?? 0} />

      {/* Detail Modal */}
      <SystemValidationDetailModal />
    </PageMotion>
  );
}
