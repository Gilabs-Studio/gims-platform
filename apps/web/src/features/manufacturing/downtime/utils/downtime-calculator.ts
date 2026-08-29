import type {
  CategoryBreakdownItem,
  DowntimeCategory,
  DowntimeCategoryType,
  DowntimeIncident,
  DowntimeKpiSummary,
  ParetoItem,
} from "../types/downtime.types";

/**
 * Format duration in minutes into a clean human-readable string (e.g., "3h 45m" or "45m")
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Calculate Pareto 80/20 breakdown from a list of downtime incidents
 * Sorts by either 'duration' or 'frequency' and computes cumulative percentages.
 */
export function calculateParetoDistribution(
  incidents: DowntimeIncident[],
  metric: "duration" | "frequency" = "duration"
): ParetoItem[] {
  if (incidents.length === 0) return [];

  // Group by reason
  const map = new Map<
    string,
    {
      category: DowntimeCategory;
      categoryType: DowntimeCategoryType;
      totalDurationMinutes: number;
      frequency: number;
    }
  >();

  for (const inc of incidents) {
    const existing = map.get(inc.reason);
    if (existing) {
      existing.totalDurationMinutes += inc.durationMinutes;
      existing.frequency += 1;
    } else {
      map.set(inc.reason, {
        category: inc.category,
        categoryType: inc.categoryType,
        totalDurationMinutes: inc.durationMinutes,
        frequency: 1,
      });
    }
  }

  const items = Array.from(map.entries()).map(([reason, val]) => ({
    reason,
    category: val.category,
    categoryType: val.categoryType,
    totalDurationMinutes: val.totalDurationMinutes,
    totalDurationHours: Number((val.totalDurationMinutes / 60).toFixed(1)),
    frequency: val.frequency,
    percentage: 0,
    cumulativePercentage: 0,
    isVitalFew: false,
  }));

  // Sort descending by chosen metric
  items.sort((a, b) => {
    if (metric === "frequency") {
      return b.frequency - a.frequency;
    }
    return b.totalDurationMinutes - a.totalDurationMinutes;
  });

  const totalSum = items.reduce(
    (acc, curr) => acc + (metric === "frequency" ? curr.frequency : curr.totalDurationMinutes),
    0
  );

  if (totalSum === 0) return items;

  let runningSum = 0;
  return items.map((item) => {
    const currentVal = metric === "frequency" ? item.frequency : item.totalDurationMinutes;
    runningSum += currentVal;
    const percentage = Number(((currentVal / totalSum) * 100).toFixed(1));
    const cumulativePercentage = Number(((runningSum / totalSum) * 100).toFixed(1));
    const isVitalFew = cumulativePercentage <= 80 || runningSum - currentVal < totalSum * 0.8;

    return {
      ...item,
      percentage,
      cumulativePercentage: Math.min(100, cumulativePercentage),
      isVitalFew,
    };
  });
}

/**
 * Calculate category breakdown (Planned vs Unplanned distinction)
 */
export function calculateCategoryBreakdown(incidents: DowntimeIncident[]): CategoryBreakdownItem[] {
  if (incidents.length === 0) return [];

  const map = new Map<
    DowntimeCategory,
    {
      categoryType: DowntimeCategoryType;
      totalDurationMinutes: number;
      frequency: number;
      reasonCounts: Map<string, number>;
    }
  >();

  for (const inc of incidents) {
    let entry = map.get(inc.category);
    if (!entry) {
      entry = {
        categoryType: inc.categoryType,
        totalDurationMinutes: 0,
        frequency: 0,
        reasonCounts: new Map<string, number>(),
      };
      map.set(inc.category, entry);
    }
    entry.totalDurationMinutes += inc.durationMinutes;
    entry.frequency += 1;
    entry.reasonCounts.set(inc.reason, (entry.reasonCounts.get(inc.reason) ?? 0) + 1);
  }

  const grandTotalMinutes = incidents.reduce((acc, curr) => acc + curr.durationMinutes, 0) || 1;

  const result: CategoryBreakdownItem[] = [];

  map.forEach((val, category) => {
    // Find top reason in this category
    let topReason = "-";
    let maxCount = -1;
    val.reasonCounts.forEach((cnt, r) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        topReason = r;
      }
    });

    result.push({
      category,
      categoryType: val.categoryType,
      totalDurationMinutes: val.totalDurationMinutes,
      totalDurationHours: Number((val.totalDurationMinutes / 60).toFixed(1)),
      frequency: val.frequency,
      percentageShare: Number(((val.totalDurationMinutes / grandTotalMinutes) * 100).toFixed(1)),
      topReason,
      averageDurationMinutes: Number((val.totalDurationMinutes / (val.frequency || 1)).toFixed(0)),
    });
  });

  return result.sort((a, b) => b.totalDurationMinutes - a.totalDurationMinutes);
}

/**
 * Calculate KPI summary metrics (MTTR, MTBF, Planned vs Unplanned hours, lost units)
 */
export function calculateDowntimeKpis(
  incidents: DowntimeIncident[],
  totalOperatingHours = 720 // default 30 days * 24h
): DowntimeKpiSummary {
  const totalLostTimeMinutes = incidents.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalLostTimeHours = Number((totalLostTimeMinutes / 60).toFixed(1));
  const totalIncidents = incidents.length;

  const unplannedIncidents = incidents.filter((i) => i.categoryType === "unplanned");
  const plannedIncidents = incidents.filter((i) => i.categoryType === "planned");

  const unplannedMinutes = unplannedIncidents.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const plannedMinutes = plannedIncidents.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const unplannedDurationHours = Number((unplannedMinutes / 60).toFixed(1));
  const plannedDurationHours = Number((plannedMinutes / 60).toFixed(1));

  const unplannedPercentage = totalLostTimeMinutes > 0 ? Number(((unplannedMinutes / totalLostTimeMinutes) * 100).toFixed(1)) : 0;
  const plannedPercentage = totalLostTimeMinutes > 0 ? Number(((plannedMinutes / totalLostTimeMinutes) * 100).toFixed(1)) : 0;

  // MTTR = Total Unplanned Downtime (mins) / Number of Unplanned Breakdowns
  const mttrMinutes = unplannedIncidents.length > 0 ? Number((unplannedMinutes / unplannedIncidents.length).toFixed(1)) : 0;

  // MTBF = (Total Operating Time - Downtime) / Number of Breakdowns
  const actualOperatingMinutes = totalOperatingHours * 60 - totalLostTimeMinutes;
  const mtbfHours =
    unplannedIncidents.length > 0
      ? Number((actualOperatingMinutes / 60 / unplannedIncidents.length).toFixed(1))
      : Number(totalOperatingHours.toFixed(1));

  const estimatedUnitsLost = incidents.reduce((acc, curr) => acc + (curr.lostUnitsEstimated ?? 0), 0);
  const estimatedCostLost = incidents.reduce((acc, curr) => acc + (curr.financialImpactEstimated ?? 0), 0);

  // Top loss driver
  const pareto = calculateParetoDistribution(incidents, "duration");
  const topLossDriver = pareto[0]?.reason ?? "N/A";
  const topLossDriverMinutes = pareto[0]?.totalDurationMinutes ?? 0;

  return {
    totalLostTimeHours,
    totalLostTimeMinutes,
    totalIncidents,
    unplannedDurationHours,
    plannedDurationHours,
    unplannedPercentage,
    plannedPercentage,
    mttrMinutes,
    mtbfHours,
    estimatedUnitsLost,
    estimatedCostLost,
    topLossDriver,
    topLossDriverMinutes,
    comparisonVsLastPeriodPercentage: -14.2, // Mock 14.2% improvement vs previous period
  };
}
