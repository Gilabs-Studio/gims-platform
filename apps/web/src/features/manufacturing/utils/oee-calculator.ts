import type { MachineItem, OEEMetrics, ProductionLine, WorkOrder } from "../types/oee.types";

/**
 * Calculates Availability % = (Operating Time / Planned Production Time) * 100
 */
export function calculateAvailability(plannedMinutes: number, downtimeMinutes: number): number {
  if (plannedMinutes <= 0) return 0;
  const operatingMinutes = Math.max(0, plannedMinutes - downtimeMinutes);
  return Number(((operatingMinutes / plannedMinutes) * 100).toFixed(1));
}

/**
 * Calculates Performance % = (Total Parts Produced / Target Parts) * 100
 * Or (Ideal Cycle Time * Total Parts / Operating Time) * 100
 */
export function calculatePerformance(actualParts: number, targetParts: number): number {
  if (targetParts <= 0) return 0;
  return Number(Math.min(100, (actualParts / targetParts) * 100).toFixed(1));
}

/**
 * Calculates Quality % = ((Total Parts - Defective Parts) / Total Parts) * 100
 */
export function calculateQuality(totalParts: number, scrapParts: number): number {
  if (totalParts <= 0) return 100;
  const goodParts = Math.max(0, totalParts - scrapParts);
  return Number(((goodParts / totalParts) * 100).toFixed(1));
}

/**
 * Calculates Overall OEE = (Availability * Performance * Quality) / 10000
 */
export function calculateOee(availability: number, performance: number, quality: number): number {
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
  return Number(oee.toFixed(1));
}

/**
 * Aggregates summary OEEMetrics from a list of machines and work orders
 */
export function calculateAggregateOEE(
  machines: MachineItem[],
  workOrders: WorkOrder[],
  lines: ProductionLine[]
): OEEMetrics {
  if (machines.length === 0) {
    return {
      overallOee: 0,
      targetOee: 85.0,
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

  const runningCount = machines.filter((m) => m.status === "running").length;
  const downtimeCount = machines.filter((m) => m.status === "downtime").length;

  const totalAvail = machines.reduce((acc, m) => acc + m.availabilityScore, 0);
  const totalPerf = machines.reduce((acc, m) => acc + m.performanceScore, 0);
  const totalQual = machines.reduce((acc, m) => acc + m.qualityScore, 0);

  const averageAvailability = Number((totalAvail / machines.length).toFixed(1));
  const averagePerformance = Number((totalPerf / machines.length).toFixed(1));
  const averageQuality = Number((totalQual / machines.length).toFixed(1));

  const overallOee = calculateOee(averageAvailability, averagePerformance, averageQuality);

  const totalTargetOutput = workOrders.reduce((acc, wo) => acc + wo.targetQuantity, 0);
  const totalActualOutput = workOrders.reduce((acc, wo) => acc + wo.completedQuantity, 0);
  const totalScrapUnits = workOrders.reduce((acc, wo) => acc + wo.scrapQuantity, 0);

  const defectRate = totalActualOutput > 0
    ? Number(((totalScrapUnits / totalActualOutput) * 100).toFixed(1))
    : 0;

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
    runningMachinesCount: runningCount,
    downtimeMachinesCount: downtimeCount,
    totalMachinesCount: machines.length,
  };
}
