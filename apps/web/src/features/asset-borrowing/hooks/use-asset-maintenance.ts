import { useState } from "react";
import type { MaintenanceRecord } from "../types";
import { INITIAL_MAINTENANCE } from "../services/mock-data";
import type { MaintenanceFormValues } from "../schemas/asset-borrowing.schema";

export function useAssetMaintenance() {
  const [records, setRecords] =
    useState<MaintenanceRecord[]>(INITIAL_MAINTENANCE);

  const getMaintenanceByAssetId = (assetId: string): MaintenanceRecord[] => {
    return records.filter((m) => m.asset_id === assetId);
  };

  const handleAddMaintenance = (
    assetId: string,
    data: MaintenanceFormValues,
  ) => {
    const newRecord: MaintenanceRecord = {
      id: `mtn-${Date.now()}`,
      asset_id: assetId,
      maintenance_number: `MNT-202608-000${records.length + 1}`,
      service_type: data.service_type,
      maintenance_date: data.maintenance_date,
      cost: data.cost,
      vendor_name: data.vendor_name,
      notes: data.notes,
      status: "scheduled",
    };

    setRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  return {
    records,
    getMaintenanceByAssetId,
    handleAddMaintenance,
  };
}
