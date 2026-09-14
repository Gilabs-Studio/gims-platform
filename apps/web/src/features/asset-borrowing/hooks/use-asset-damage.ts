import { useState } from "react";
import type { DamageReport } from "../types";
import { INITIAL_DAMAGE_REPORTS } from "../services/mock-data";
import type { DamageReportFormValues } from "../schemas/asset-borrowing.schema";

export function useAssetDamage() {
  const [reports, setReports] =
    useState<DamageReport[]>(INITIAL_DAMAGE_REPORTS);

  const getDamageReportsByAssetId = (assetId: string): DamageReport[] => {
    return reports.filter((r) => r.asset_id === assetId);
  };

  const handleReportDamage = (
    assetId: string,
    data: DamageReportFormValues,
  ) => {
    const newReport: DamageReport = {
      id: `dmg-${Date.now()}`,
      asset_id: assetId,
      report_number: `DMG-202608-000${reports.length + 1}`,
      reported_by_id: "emp-current",
      reported_by_name: "Admin User",
      severity: data.severity,
      description: data.description,
      reported_date: new Date().toISOString().split("T")[0],
      status: "reported",
    };

    setReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  return {
    reports,
    getDamageReportsByAssetId,
    handleReportDamage,
  };
}
