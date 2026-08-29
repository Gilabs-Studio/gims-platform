import type {
  CategoryBreakdownItem,
  CreateDowntimeInput,
  DowntimeFilterParams,
  DowntimeIncident,
  DowntimeKpiSummary,
  LineImpactItem,
  ParetoItem,
  ProductionLineInfo,
  ShiftTrendItem,
  UpdateDowntimeInput,
} from "../types/downtime.types";
import {
  calculateCategoryBreakdown,
  calculateDowntimeKpis,
  calculateParetoDistribution,
} from "../utils/downtime-calculator";

export const MOCK_PRODUCTION_LINES: ProductionLineInfo[] = [
  { id: "line-1", name: "Line 1 — Sterile Liquid Vial Fill", code: "L1-VIAL" },
  { id: "line-2", name: "Line 2 — Tablet Blister Packaging", code: "L2-BLIST" },
  { id: "line-3", name: "Line 3 — Syrup Bottle Rotary Line", code: "L3-BOTTL" },
  { id: "line-4", name: "Line 4 — Powder Sachet Packing Line", code: "L4-SACH" },
];

export const INITIAL_DOWNTIME_INCIDENTS: DowntimeIncident[] = [
  {
    id: "dt-001",
    incidentNumber: "DT-2026-0829-01",
    machineId: "mch-01",
    machineName: "Sterile Liquid Vial Filler A1",
    lineId: "line-1",
    lineName: "Line 1 — Sterile Liquid Vial Fill",
    categoryType: "unplanned",
    category: "Machine Breakdown",
    reason: "Sealing Jaw Heating Element Burnout",
    rootCauseAnalysis: "Heating cartridge exceeded thermal duty cycle due to PID controller oscillation. Resistance wire fractured.",
    actionTaken: "Replaced heating element cartridge, re-tuned PID loop parameters, recalibrated temperature thermocouple.",
    severity: "critical",
    status: "resolved",
    startTime: "2026-08-29 08:15",
    endTime: "2026-08-29 10:00",
    durationMinutes: 105,
    financialImpactEstimated: 24500000,
    lostUnitsEstimated: 3500,
    reportedBy: "Ahmad Sanjaya (Line Lead)",
    assignedTechnician: "Budi Santoso (Sr. Tech)",
    capaRequired: true,
    capaId: "CAPA-2026-042",
  },
  {
    id: "dt-002",
    incidentNumber: "DT-2026-0829-02",
    machineId: "mch-02",
    machineName: "High-Speed Blister Packager B2",
    lineId: "line-2",
    lineName: "Line 2 — Tablet Blister Packaging",
    categoryType: "planned",
    category: "Changeover & Setup",
    reason: "Packaging Format Changeover (100ml to 250ml)",
    rootCauseAnalysis: "Scheduled batch changeover from 100ml blister format to 250ml carton format as per production schedule WO-4921.",
    actionTaken: "Replaced forming guide rails, swapped blister feeder mold, ran line clearance protocol and test batch.",
    severity: "low",
    status: "resolved",
    startTime: "2026-08-29 06:00",
    endTime: "2026-08-29 07:15",
    durationMinutes: 75,
    financialImpactEstimated: 0,
    lostUnitsEstimated: 0,
    reportedBy: "Dewi Lestari (Operator)",
    assignedTechnician: "Rian Prasetyo (Setup Tech)",
    capaRequired: false,
  },
  {
    id: "dt-003",
    incidentNumber: "DT-2026-0828-03",
    machineId: "mch-03",
    machineName: "Syrup Rotary Monoblock Filler",
    lineId: "line-3",
    lineName: "Line 3 — Syrup Bottle Rotary Line",
    categoryType: "unplanned",
    category: "Component Failure",
    reason: "Bottle Infeed Conveyor Jam",
    rootCauseAnalysis: "Guide plate alignment shifted 3mm due to loose lock nut, causing irregular bottle spacing and jamming starwheel.",
    actionTaken: "Cleared jammed bottles, tightened guide rail fixture with torque wrench, checked starwheel timing sensors.",
    severity: "medium",
    status: "resolved",
    startTime: "2026-08-28 14:20",
    endTime: "2026-08-28 15:10",
    durationMinutes: 50,
    financialImpactEstimated: 8500000,
    lostUnitsEstimated: 1200,
    reportedBy: "Hendra Wijaya (Operator)",
    assignedTechnician: "Budi Santoso (Sr. Tech)",
    capaRequired: false,
  },
  {
    id: "dt-004",
    incidentNumber: "DT-2026-0828-04",
    machineId: "mch-01",
    machineName: "Sterile Liquid Vial Filler A1",
    lineId: "line-1",
    lineName: "Line 1 — Sterile Liquid Vial Fill",
    categoryType: "planned",
    category: "CIP & Cleaning Validation",
    reason: "CIP & Cleaning Validation Cycle",
    rootCauseAnalysis: "Mandatory Clean-in-Place (CIP) cycle and total organic carbon (TOC) swab test between antibiotic batches.",
    actionTaken: "Ran 4-stage caustic and acid wash, verified conductivity rinse levels, verified microbiological swab clearance.",
    severity: "low",
    status: "resolved",
    startTime: "2026-08-28 11:30",
    endTime: "2026-08-28 13:00",
    durationMinutes: 90,
    financialImpactEstimated: 0,
    lostUnitsEstimated: 0,
    reportedBy: "Siti Rahma (QA Officer)",
    assignedTechnician: "Arif Kurniawan (CIP Tech)",
    capaRequired: false,
  },
  {
    id: "dt-005",
    incidentNumber: "DT-2026-0827-05",
    machineId: "mch-04",
    machineName: "Powder Multi-lane Sachet Machine",
    lineId: "line-4",
    lineName: "Line 4 — Powder Sachet Packing Line",
    categoryType: "unplanned",
    category: "Material Shortage",
    reason: "Secondary Carton Pre-printed Stock Delay",
    rootCauseAnalysis: "Warehouse shipment delay for pre-printed outer cartons due to supplier barcode mismatch at receiving dock.",
    actionTaken: "Expedited QC inspection on alternative lot batch #CT-8890, adjusted pallet conveyor queue.",
    severity: "high",
    status: "resolved",
    startTime: "2026-08-27 09:40",
    endTime: "2026-08-27 11:00",
    durationMinutes: 80,
    financialImpactEstimated: 16000000,
    lostUnitsEstimated: 2600,
    reportedBy: "Fajar Nugraha (Logistics)",
    assignedTechnician: "Dedi Supriyadi",
    capaRequired: true,
    capaId: "CAPA-2026-039",
  },
  {
    id: "dt-006",
    incidentNumber: "DT-2026-0827-06",
    machineId: "mch-02",
    machineName: "High-Speed Blister Packager B2",
    lineId: "line-2",
    lineName: "Line 2 — Tablet Blister Packaging",
    categoryType: "unplanned",
    category: "Component Failure",
    reason: "Foil Roll Sensor Optical Alignment Error",
    rootCauseAnalysis: "Photoelectric fiber eye covered by aluminum dust particulates, triggering false out-of-foil interlock.",
    actionTaken: "Cleaned optical sensor lens with isopropyl alcohol, installed compressed air purge nozzle to prevent dust buildup.",
    severity: "low",
    status: "resolved",
    startTime: "2026-08-27 16:15",
    endTime: "2026-08-27 16:45",
    durationMinutes: 30,
    financialImpactEstimated: 3500000,
    lostUnitsEstimated: 600,
    reportedBy: "Dewi Lestari (Operator)",
    assignedTechnician: "Rian Prasetyo",
    capaRequired: false,
  },
  {
    id: "dt-007",
    incidentNumber: "DT-2026-0826-07",
    machineId: "mch-03",
    machineName: "Syrup Rotary Monoblock Filler",
    lineId: "line-3",
    lineName: "Line 3 — Syrup Bottle Rotary Line",
    categoryType: "unplanned",
    category: "Quality Inspection Hold",
    reason: "Cap Torque Quality Check Fail & Re-calibration",
    rootCauseAnalysis: "Magnetic clutch torque on capping head #4 drifted below specification (target 1.8 Nm, measured 1.2 Nm).",
    actionTaken: "Replaced worn magnetic clutch rings on capping head #4 and verified torque on 50 consecutive sample bottles.",
    severity: "high",
    status: "resolved",
    startTime: "2026-08-26 13:00",
    endTime: "2026-08-26 14:10",
    durationMinutes: 70,
    financialImpactEstimated: 12000000,
    lostUnitsEstimated: 1800,
    reportedBy: "Siti Rahma (QA Officer)",
    assignedTechnician: "Budi Santoso (Sr. Tech)",
    capaRequired: true,
    capaId: "CAPA-2026-037",
  },
  {
    id: "dt-008",
    incidentNumber: "DT-2026-0826-08",
    machineId: "mch-04",
    machineName: "Powder Multi-lane Sachet Machine",
    lineId: "line-4",
    lineName: "Line 4 — Powder Sachet Packing Line",
    categoryType: "planned",
    category: "Scheduled Maintenance",
    reason: "Monthly Preventive Maintenance (Lubrication & Belts)",
    rootCauseAnalysis: "Routine 500-hour planned maintenance checklist including drive chain lubrication and timing belt inspection.",
    actionTaken: "Completed PM checklist, replaced drive belt B-12, greased high-speed bearings.",
    severity: "low",
    status: "resolved",
    startTime: "2026-08-26 07:00",
    endTime: "2026-08-26 08:30",
    durationMinutes: 90,
    financialImpactEstimated: 0,
    lostUnitsEstimated: 0,
    reportedBy: "Dedi Supriyadi (Maint Lead)",
    assignedTechnician: "Dedi Supriyadi",
    capaRequired: false,
  },
  {
    id: "dt-009",
    incidentNumber: "DT-2026-0825-09",
    machineId: "mch-01",
    machineName: "Sterile Liquid Vial Filler A1",
    lineId: "line-1",
    lineName: "Line 1 — Sterile Liquid Vial Fill",
    categoryType: "unplanned",
    category: "Utility Failure",
    reason: "Main Air Compressor Pressure Drop",
    rootCauseAnalysis: "Plant central pneumatic distribution line pressure dropped below 5.5 bar due to moisture condensate valve freeze.",
    actionTaken: "Purged pneumatic condensate drain, adjusted plant air pressure regulator to stable 6.5 bar.",
    severity: "medium",
    status: "resolved",
    startTime: "2026-08-25 10:15",
    endTime: "2026-08-25 11:00",
    durationMinutes: 45,
    financialImpactEstimated: 9500000,
    lostUnitsEstimated: 1400,
    reportedBy: "Ahmad Sanjaya (Line Lead)",
    assignedTechnician: "Facility Utility Team",
    capaRequired: false,
  },
  {
    id: "dt-010",
    incidentNumber: "DT-2026-0825-10",
    machineId: "mch-02",
    machineName: "High-Speed Blister Packager B2",
    lineId: "line-2",
    lineName: "Line 2 — Tablet Blister Packaging",
    categoryType: "unplanned",
    category: "Machine Breakdown",
    reason: "Sealing Jaw Heating Element Burnout",
    rootCauseAnalysis: "Recurrent thermal degradation on lower sealing jaw plate thermocouple connection.",
    actionTaken: "Rewired thermal sensor with high-temperature glass-sleeved wiring.",
    severity: "high",
    status: "resolved",
    startTime: "2026-08-25 18:30",
    endTime: "2026-08-25 19:30",
    durationMinutes: 60,
    financialImpactEstimated: 11000000,
    lostUnitsEstimated: 1600,
    reportedBy: "Dewi Lestari (Operator)",
    assignedTechnician: "Budi Santoso",
    capaRequired: true,
    capaId: "CAPA-2026-035",
  },
  {
    id: "dt-011",
    incidentNumber: "DT-2026-0824-11",
    machineId: "mch-04",
    machineName: "Powder Multi-lane Sachet Machine",
    lineId: "line-4",
    lineName: "Line 4 — Powder Sachet Packing Line",
    categoryType: "planned",
    category: "Tooling / Mold Change",
    reason: "Tooling & Sealing Mold Replacement",
    rootCauseAnalysis: "Switching from 4-side seal to 3-side seal geometry for promotion pack campaign.",
    actionTaken: "Installed customized knife assembly and sealing die set, tested leak integrity with dye bath.",
    severity: "low",
    status: "resolved",
    startTime: "2026-08-24 15:00",
    endTime: "2026-08-24 16:15",
    durationMinutes: 75,
    financialImpactEstimated: 0,
    lostUnitsEstimated: 0,
    reportedBy: "Fajar Nugraha",
    assignedTechnician: "Rian Prasetyo",
    capaRequired: false,
  },
  {
    id: "dt-012",
    incidentNumber: "DT-2026-0824-12",
    machineId: "mch-03",
    machineName: "Syrup Rotary Monoblock Filler",
    lineId: "line-3",
    lineName: "Line 3 — Syrup Bottle Rotary Line",
    categoryType: "unplanned",
    category: "Operator Absence",
    reason: "Shift Operator Absence on Station 3",
    rootCauseAnalysis: "Unplanned sick leave without immediate relief operator causing station speed slowdown and stoppage.",
    actionTaken: "Cross-trained backup operator dispatched from packaging buffer pool.",
    severity: "low",
    status: "resolved",
    startTime: "2026-08-24 08:00",
    endTime: "2026-08-24 08:35",
    durationMinutes: 35,
    financialImpactEstimated: 4200000,
    lostUnitsEstimated: 750,
    reportedBy: "Hendra Wijaya",
    assignedTechnician: "HR & Shift Supervisor",
    capaRequired: false,
  },
  {
    id: "dt-013",
    incidentNumber: "DT-2026-0829-13",
    machineId: "mch-01",
    machineName: "Sterile Liquid Vial Filler A1",
    lineId: "line-1",
    lineName: "Line 1 — Sterile Liquid Vial Fill",
    categoryType: "unplanned",
    category: "Component Failure",
    reason: "Bottle Infeed Conveyor Jam",
    rootCauseAnalysis: "Friction strip worn out near infeed rotary turntable.",
    actionTaken: "Replaced Teflon wear strips and adjusted guide clearance.",
    severity: "medium",
    status: "resolved",
    startTime: "2026-08-29 14:00",
    endTime: "2026-08-29 14:40",
    durationMinutes: 40,
    financialImpactEstimated: 6800000,
    lostUnitsEstimated: 1100,
    reportedBy: "Ahmad Sanjaya",
    assignedTechnician: "Budi Santoso",
    capaRequired: false,
  },
];

// In-memory data store for the mock service
let incidentsStore: DowntimeIncident[] = [...INITIAL_DOWNTIME_INCIDENTS];

class DowntimeService {
  async getProductionLines(): Promise<ProductionLineInfo[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return MOCK_PRODUCTION_LINES;
  }

  async getIncidents(params?: DowntimeFilterParams): Promise<DowntimeIncident[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    let filtered = [...incidentsStore];

    if (params?.lineId && params.lineId !== "all") {
      filtered = filtered.filter((i) => i.lineId === params.lineId);
    }
    if (params?.categoryType && params.categoryType !== "all") {
      filtered = filtered.filter((i) => i.categoryType === params.categoryType);
    }
    if (params?.category && params.category !== "all") {
      filtered = filtered.filter((i) => i.category === params.category);
    }
    if (params?.severity && params.severity !== "all") {
      filtered = filtered.filter((i) => i.severity === params.severity);
    }
    if (params?.status && params.status !== "all") {
      filtered = filtered.filter((i) => i.status === params.status);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.incidentNumber.toLowerCase().includes(q) ||
          i.reason.toLowerCase().includes(q) ||
          i.machineName.toLowerCase().includes(q) ||
          i.reportedBy.toLowerCase().includes(q) ||
          (i.rootCauseAnalysis && i.rootCauseAnalysis.toLowerCase().includes(q))
      );
    }

    return filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async getKpis(params?: DowntimeFilterParams): Promise<DowntimeKpiSummary> {
    const incidents = await this.getIncidents(params);
    return calculateDowntimeKpis(incidents);
  }

  async getParetoData(
    params?: DowntimeFilterParams,
    metric: "duration" | "frequency" = "duration"
  ): Promise<ParetoItem[]> {
    const incidents = await this.getIncidents(params);
    return calculateParetoDistribution(incidents, metric);
  }

  async getCategoryBreakdown(params?: DowntimeFilterParams): Promise<CategoryBreakdownItem[]> {
    const incidents = await this.getIncidents(params);
    return calculateCategoryBreakdown(incidents);
  }

  async getShiftTrends(params?: DowntimeFilterParams): Promise<ShiftTrendItem[]> {
    const incidents = await this.getIncidents(params);

    // Distribution mock across shifts:
    // Shift 1: 06:00-14:00
    // Shift 2: 14:00-22:00
    // Shift 3: 22:00-06:00
    const shift1 = incidents.filter((i) => {
      const hour = parseInt(i.startTime.split(" ")[1]?.split(":")[0] ?? "0", 10);
      return hour >= 6 && hour < 14;
    });
    const shift2 = incidents.filter((i) => {
      const hour = parseInt(i.startTime.split(" ")[1]?.split(":")[0] ?? "0", 10);
      return hour >= 14 && hour < 22;
    });
    const shift3 = incidents.filter((i) => {
      const hour = parseInt(i.startTime.split(" ")[1]?.split(":")[0] ?? "0", 10);
      return hour >= 22 || hour < 6;
    });

    const computeShift = (name: string, label: string, list: DowntimeIncident[]): ShiftTrendItem => {
      const unplannedMinutes = list.filter((i) => i.categoryType === "unplanned").reduce((acc, c) => acc + c.durationMinutes, 0);
      const plannedMinutes = list.filter((i) => i.categoryType === "planned").reduce((acc, c) => acc + c.durationMinutes, 0);
      return {
        shift: name,
        timeLabel: label,
        unplannedDurationMinutes: unplannedMinutes,
        plannedDurationMinutes: plannedMinutes,
        totalDurationMinutes: unplannedMinutes + plannedMinutes,
        incidentCount: list.length,
      };
    };

    return [
      computeShift("Shift 1 (Pagi)", "06:00 - 14:00", shift1),
      computeShift("Shift 2 (Siang)", "14:00 - 22:00", shift2),
      computeShift("Shift 3 (Malam)", "22:00 - 06:00", shift3),
    ];
  }

  async getLineImpacts(): Promise<LineImpactItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return MOCK_PRODUCTION_LINES.map((line) => {
      const lineIncidents = incidentsStore.filter((i) => i.lineId === line.id);
      const unplannedMins = lineIncidents.filter((i) => i.categoryType === "unplanned").reduce((acc, c) => acc + c.durationMinutes, 0);
      const plannedMins = lineIncidents.filter((i) => i.categoryType === "planned").reduce((acc, c) => acc + c.durationMinutes, 0);
      const totalMins = unplannedMins + plannedMins;
      const unplannedCount = lineIncidents.filter((i) => i.categoryType === "unplanned").length;
      const mttr = unplannedCount > 0 ? Number((unplannedMins / unplannedCount).toFixed(0)) : 0;
      const scheduledTotal = 1440 * 7; // 1 week in minutes
      const availabilityLoss = Number(((totalMins / scheduledTotal) * 100).toFixed(1));

      return {
        lineId: line.id,
        lineName: line.name,
        unplannedMinutes: unplannedMins,
        plannedMinutes: plannedMins,
        totalLostMinutes: totalMins,
        totalIncidents: lineIncidents.length,
        mttrMinutes: mttr,
        availabilityLossPercentage: availabilityLoss,
      };
    });
  }

  async getIncidentById(id: string): Promise<DowntimeIncident | null> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return incidentsStore.find((i) => i.id === id) ?? null;
  }

  async createIncident(input: CreateDowntimeInput): Promise<DowntimeIncident> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const line = MOCK_PRODUCTION_LINES.find((l) => l.id === input.lineId) ?? MOCK_PRODUCTION_LINES[0];
    const newIncident: DowntimeIncident = {
      id: `dt-${Date.now()}`,
      incidentNumber: `DT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(10 + Math.random() * 90)}`,
      machineId: input.machineId,
      machineName: input.machineId === "mch-01" ? "Sterile Liquid Vial Filler A1" : input.machineId === "mch-02" ? "High-Speed Blister Packager B2" : input.machineId === "mch-03" ? "Syrup Rotary Monoblock Filler" : "Powder Multi-lane Sachet Machine",
      lineId: input.lineId,
      lineName: line.name,
      categoryType: input.categoryType,
      category: input.category,
      reason: input.reason,
      rootCauseAnalysis: input.rootCauseAnalysis,
      actionTaken: input.actionTaken,
      severity: input.severity,
      status: input.status,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      lostUnitsEstimated: input.lostUnitsEstimated ?? 0,
      financialImpactEstimated: (input.lostUnitsEstimated ?? 0) * 7000,
      reportedBy: input.reportedBy,
      assignedTechnician: input.assignedTechnician,
      capaRequired: input.capaRequired,
      capaId: input.capaRequired ? `CAPA-2026-0${Math.floor(50 + Math.random() * 40)}` : undefined,
    };

    incidentsStore = [newIncident, ...incidentsStore];
    return newIncident;
  }

  async updateIncident(input: UpdateDowntimeInput): Promise<DowntimeIncident> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = incidentsStore.findIndex((i) => i.id === input.id);
    if (idx === -1) {
      throw new Error(`Incident with id ${input.id} not found`);
    }

    const updated = {
      ...incidentsStore[idx],
      ...input,
    };
    incidentsStore[idx] = updated;
    return updated;
  }

  async deleteIncident(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    incidentsStore = incidentsStore.filter((i) => i.id !== id);
    return true;
  }
}

export const downtimeService = new DowntimeService();
