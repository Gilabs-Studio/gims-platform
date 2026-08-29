import type { MachineItem, OEEMetrics, WorkOrder } from "../types/oee.types";

export function calculateAggregateOEE(
  machines: MachineItem[],
  workOrders: WorkOrder[]
): OEEMetrics {
  if (machines.length === 0) {
    return {
      overallOee: 0,
      targetOee: 85,
      averageAvailability: 0,
      averagePerformance: 0,
      averageQuality: 0,
      totalTargetOutput: 0,
      totalActualOutput: 0,
      totalScrapUnits: 0,
      defectRate: 0,
      runningMachinesCount: 0,
      downtimeMachinesCount: 0,
      totalMachinesCount: 0,
    };
  }

  const totalOee = machines.reduce((acc, m) => acc + m.oeeScore, 0);
  const totalAvail = machines.reduce((acc, m) => acc + m.availabilityScore, 0);
  const totalPerf = machines.reduce((acc, m) => acc + m.performanceScore, 0);
  const totalQual = machines.reduce((acc, m) => acc + m.qualityScore, 0);

  const overallOee = Math.round((totalOee / machines.length) * 10) / 10;
  const averageAvailability = Math.round((totalAvail / machines.length) * 10) / 10;
  const averagePerformance = Math.round((totalPerf / machines.length) * 10) / 10;
  const averageQuality = Math.round((totalQual / machines.length) * 10) / 10;

  const totalTargetOutput = workOrders.reduce((acc, wo) => acc + wo.targetQuantity, 0);
  const totalActualOutput = workOrders.reduce((acc, wo) => acc + wo.completedQuantity, 0);
  const totalScrapUnits = workOrders.reduce((acc, wo) => acc + wo.scrapQuantity, 0);

  const defectRate =
    totalActualOutput + totalScrapUnits > 0
      ? Math.round((totalScrapUnits / (totalActualOutput + totalScrapUnits)) * 1000) / 10
      : 0;

  const runningMachinesCount = machines.filter((m) => m.status === "running").length;
  const downtimeMachinesCount = machines.filter((m) => m.status === "downtime" || m.status === "maintenance").length;

  return {
    overallOee,
    targetOee: 85.0,
    averageAvailability,
    averagePerformance,
    averageQuality,
    totalTargetOutput,
    totalActualOutput,
    totalScrapUnits,
    defectRate,
    runningMachinesCount,
    downtimeMachinesCount,
    totalMachinesCount: machines.length,
  };
}
