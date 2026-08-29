import type {
  AcknowledgeAlarmInput,
  AndonDashboardData,
  AndonFilterParams,
  AndonListResponse,
  AndonParameterItem,
  EscalateToQAInput,
  LogQualityIncidentInput,
  QualityDeviationIncident,
} from "../types/quality-andon.types";

const INITIAL_ANDON_PARAMETERS: AndonParameterItem[] = [
  {
    id: "param-01",
    code: "CPP-VIS-01",
    name: "Ointment Viscosity in Vacuum Mixer",
    category: "viscosity",
    batchNumber: "BATCH-PCT-2608-01",
    workOrderCode: "WO-2026-0801",
    productName: "Paracetamol 500mg Film-Coated Tablet",
    lineId: "LINE-1",
    lineName: "Line A - Filling & Granulation",
    machineId: "MCH-MIX-01",
    machineName: "Diosna High-Shear Granulator 600L",
    currentValue: 12400,
    unit: "cP",
    lowerSpecLimit: 14000,
    targetValue: 15000,
    upperSpecLimit: 16000,
    status: "critical_alarm",
    isAcknowledged: false,
    lastSampleTime: "2026-08-29T14:15:00Z",
    operatorId: "emp-01",
    operatorName: "Ahmad Pratama",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ahmad",
    operatorRole: "Senior Production Pharmacist",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-01", timestamp: "13:30", value: 14800, unit: "cP", status: "normal" },
      { id: "tel-02", timestamp: "13:45", value: 14200, unit: "cP", status: "normal" },
      { id: "tel-03", timestamp: "14:00", value: 13600, unit: "cP", status: "warning" },
      { id: "tel-04", timestamp: "14:15", value: 12400, unit: "cP", status: "critical_alarm" },
    ],
    incidents: [
      {
        id: "inc-01",
        code: "DEV-2026-0081",
        title: "Binder Solution Shear Degradation",
        description: "Viscosity dropped below LSL (12,400 cP vs 14,000 cP limit). Suspected high impeller shear duration during binder addition.",
        severity: "critical",
        status: "open",
        loggedAt: "2026-08-29T14:18:00Z",
        loggedBy: "Ahmad Pratama",
        qaAssignedTo: "Dewi Lestari",
        correctiveAction: "Halted granulator impeller. Taking IPC sample for QA analytical validation.",
        isCapaRequired: true,
      },
    ],
    auditLogs: [
      {
        id: "aud-01",
        timestamp: "2026-08-29T14:15:00Z",
        actorName: "SCADA Quality Gateway",
        actorRole: "Automated Telemetry Service",
        action: "Triggered Critical Andon Alarm (Out of Spec)",
        details: "Value 12,400 cP breached LSL limit of 14,000 cP.",
        signatureHash: "e4a8b792c3d1f05e4a8b792c3d1f05e4a8b792c3d1f05e4a8b792c3d1f05e4",
      },
    ],
    notes: "Requires QA physical verification before granulator discharge.",
  },
  {
    id: "param-02",
    code: "CPP-TMP-02",
    name: "Fluid Bed Dryer Outlet Air Temp",
    category: "temperature",
    batchNumber: "BATCH-PCT-2608-01",
    workOrderCode: "WO-2026-0801",
    productName: "Paracetamol 500mg Film-Coated Tablet",
    lineId: "LINE-1",
    lineName: "Line A - Filling & Granulation",
    machineId: "MCH-FBD-01",
    machineName: "Glatt WSG-Pro Fluid Bed Dryer",
    currentValue: 47.5,
    unit: "°C",
    lowerSpecLimit: 45.0,
    targetValue: 48.0,
    upperSpecLimit: 52.0,
    status: "normal",
    isAcknowledged: true,
    acknowledgedBy: "Ahmad Pratama",
    acknowledgedAt: "2026-08-29T13:00:00Z",
    lastSampleTime: "2026-08-29T14:10:00Z",
    operatorId: "emp-01",
    operatorName: "Ahmad Pratama",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ahmad",
    operatorRole: "Senior Production Pharmacist",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-05", timestamp: "13:30", value: 46.8, unit: "°C", status: "normal" },
      { id: "tel-06", timestamp: "13:45", value: 47.2, unit: "°C", status: "normal" },
      { id: "tel-07", timestamp: "14:00", value: 47.4, unit: "°C", status: "normal" },
      { id: "tel-08", timestamp: "14:10", value: 47.5, unit: "°C", status: "normal" },
    ],
    incidents: [],
    auditLogs: [],
  },
  {
    id: "param-03",
    code: "CPP-HRD-03",
    name: "Tablet Compression Breaking Force (Hardness)",
    category: "hardness",
    batchNumber: "BATCH-MET-2608-07",
    workOrderCode: "WO-2026-0807",
    productName: "Metformin HCl 500mg Extended-Release",
    lineId: "LINE-1",
    lineName: "Line A - Filling & Granulation",
    machineId: "MCH-TAB-01",
    machineName: "Fette 2090i Rotary Tablet Press",
    currentValue: 73.0,
    unit: "N",
    lowerSpecLimit: 75.0,
    targetValue: 90.0,
    upperSpecLimit: 110.0,
    status: "warning",
    isAcknowledged: true,
    acknowledgedBy: "Hendra Wijaya",
    acknowledgedAt: "2026-08-29T13:45:00Z",
    lastSampleTime: "2026-08-29T14:05:00Z",
    operatorId: "emp-05",
    operatorName: "Hendra Wijaya",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Hendra",
    operatorRole: "Process Chemist",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-09", timestamp: "13:00", value: 88.0, unit: "N", status: "normal" },
      { id: "tel-10", timestamp: "13:30", value: 82.0, unit: "N", status: "normal" },
      { id: "tel-11", timestamp: "14:00", value: 76.0, unit: "N", status: "warning" },
      { id: "tel-12", timestamp: "14:05", value: 73.0, unit: "N", status: "warning" },
    ],
    incidents: [
      {
        id: "inc-02",
        code: "DEV-2026-0082",
        title: "Compression Main Force Drift",
        description: "Tablet hardness drifted downwards to 73N (LSL 75N). Pre-compression force adjusted by operator.",
        severity: "minor",
        status: "action_taken",
        loggedAt: "2026-08-29T13:50:00Z",
        loggedBy: "Hendra Wijaya",
        correctiveAction: "Adjusted dosing cam height and increased main compression pressure by 0.5 kN.",
        isCapaRequired: false,
      },
    ],
    auditLogs: [],
  },
  {
    id: "param-04",
    code: "CPP-WGT-04",
    name: "Capsule Fill Weight Uniformity",
    category: "weight",
    batchNumber: "BATCH-AMX-2608-02",
    workOrderCode: "WO-2026-0802",
    productName: "Amoxicillin Trihydrate 500mg Capsule",
    lineId: "LINE-2",
    lineName: "Line B - Packaging & Encapsulation",
    machineId: "MCH-CAP-02",
    machineName: "Bosch GKF 1400 Encapsulator",
    currentValue: 554.0,
    unit: "mg",
    lowerSpecLimit: 560.0,
    targetValue: 580.0,
    upperSpecLimit: 600.0,
    status: "critical_alarm",
    isAcknowledged: false,
    lastSampleTime: "2026-08-29T14:12:00Z",
    operatorId: "emp-02",
    operatorName: "Siti Rahmawati",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Siti",
    operatorRole: "Production Supervisor",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-13", timestamp: "13:30", value: 578.0, unit: "mg", status: "normal" },
      { id: "tel-14", timestamp: "13:50", value: 568.0, unit: "mg", status: "normal" },
      { id: "tel-15", timestamp: "14:05", value: 558.0, unit: "mg", status: "warning" },
      { id: "tel-16", timestamp: "14:12", value: 554.0, unit: "mg", status: "critical_alarm" },
    ],
    incidents: [
      {
        id: "inc-03",
        code: "DEV-2026-0083",
        title: "Tamping Pin Powder Cavity Underfill",
        description: "Average weight of 20 capsules was 554mg against LSL of 560mg. Tamping station #4 powder bridging observed.",
        severity: "critical",
        status: "open",
        loggedAt: "2026-08-29T14:14:00Z",
        loggedBy: "Siti Rahmawati",
        qaAssignedTo: "Dewi Lestari",
        correctiveAction: "Halted encapsulation machine. Clearing powder hopper vibrator chute.",
        isCapaRequired: true,
      },
    ],
    auditLogs: [],
  },
  {
    id: "param-05",
    code: "CPP-SPR-05",
    name: "Peristaltic Spray Rate (Film Coating)",
    category: "speed",
    batchNumber: "BATCH-PCT-2608-01",
    workOrderCode: "WO-2026-0801",
    productName: "Paracetamol 500mg Film-Coated Tablet",
    lineId: "LINE-1",
    lineName: "Line A - Filling & Granulation",
    machineId: "MCH-COT-01",
    machineName: "O'Hara Fastcoat Pan Coater",
    currentValue: 133.5,
    unit: "g/min",
    lowerSpecLimit: 105.0,
    targetValue: 120.0,
    upperSpecLimit: 135.0,
    status: "warning",
    isAcknowledged: true,
    acknowledgedBy: "Ahmad Pratama",
    acknowledgedAt: "2026-08-29T13:30:00Z",
    lastSampleTime: "2026-08-29T14:00:00Z",
    operatorId: "emp-01",
    operatorName: "Ahmad Pratama",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ahmad",
    operatorRole: "Senior Production Pharmacist",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-17", timestamp: "13:00", value: 118.0, unit: "g/min", status: "normal" },
      { id: "tel-18", timestamp: "13:30", value: 125.0, unit: "g/min", status: "normal" },
      { id: "tel-19", timestamp: "14:00", value: 133.5, unit: "g/min", status: "warning" },
    ],
    incidents: [],
    auditLogs: [],
  },
  {
    id: "param-06",
    code: "CPP-VOL-06",
    name: "Liquid Syrup Piston Fill Volume",
    category: "dimension",
    batchNumber: "BATCH-DXM-2608-06",
    workOrderCode: "WO-2026-0806",
    productName: "Dextromethorphan HBr 15mg/5mL Syrup",
    lineId: "LINE-3",
    lineName: "Line D - Cartoning & Packaging",
    machineId: "MCH-FIL-01",
    machineName: "Grimex Rotary 12-Nozzle Liquid Filler",
    currentValue: 100.2,
    unit: "mL",
    lowerSpecLimit: 99.0,
    targetValue: 100.0,
    upperSpecLimit: 101.5,
    status: "normal",
    isAcknowledged: true,
    acknowledgedBy: "Budi Santoso",
    acknowledgedAt: "2026-08-29T12:00:00Z",
    lastSampleTime: "2026-08-29T13:50:00Z",
    operatorId: "emp-03",
    operatorName: "Budi Santoso",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Budi",
    operatorRole: "Machine Operator Lead",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-20", timestamp: "13:00", value: 99.8, unit: "mL", status: "normal" },
      { id: "tel-21", timestamp: "13:30", value: 100.1, unit: "mL", status: "normal" },
      { id: "tel-22", timestamp: "13:50", value: 100.2, unit: "mL", status: "normal" },
    ],
    incidents: [],
    auditLogs: [],
  },
  {
    id: "param-07",
    code: "CPP-SEM-07",
    name: "Softgel Ribbon Seam Thickness",
    category: "dimension",
    batchNumber: "BATCH-IBU-2608-03",
    workOrderCode: "WO-2026-0803",
    productName: "Ibuprofen 400mg Softgel Capsule",
    lineId: "LINE-2",
    lineName: "Line B - Packaging & Encapsulation",
    machineId: "MCH-SFT-01",
    machineName: "Changsung Softgel Machine",
    currentValue: 0.72,
    unit: "mm",
    lowerSpecLimit: 0.75,
    targetValue: 0.80,
    upperSpecLimit: 0.85,
    status: "critical_alarm",
    isAcknowledged: true,
    acknowledgedBy: "Budi Santoso",
    acknowledgedAt: "2026-08-28T14:20:00Z",
    lastSampleTime: "2026-08-28T14:15:00Z",
    operatorId: "emp-03",
    operatorName: "Budi Santoso",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Budi",
    operatorRole: "Machine Operator Lead",
    qaInspectorId: "emp-04",
    qaInspectorName: "Dewi Lestari",
    qaInspectorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    qaInspectorRole: "In-Process Quality Assurance (IPQA)",
    telemetryHistory: [
      { id: "tel-23", timestamp: "13:30", value: 0.79, unit: "mm", status: "normal" },
      { id: "tel-24", timestamp: "13:50", value: 0.76, unit: "mm", status: "normal" },
      { id: "tel-25", timestamp: "14:15", value: 0.72, unit: "mm", status: "critical_alarm" },
    ],
    incidents: [
      {
        id: "inc-04",
        code: "DEV-2026-0043",
        title: "Gelatin Ribbon Thickness Seam Drift",
        description: "Left ribbon thickness measured at 0.72mm against limit of 0.80mm ± 0.05mm. Seam leaking detected.",
        severity: "major",
        status: "investigating",
        loggedAt: "2026-08-28T14:15:00Z",
        loggedBy: "Budi Santoso",
        qaAssignedTo: "Dewi Lestari",
        correctiveAction: "Halted encapsulation tooling. Adjusted wedge temperature and spreader box gap.",
        isCapaRequired: true,
      },
    ],
    auditLogs: [],
  },
];

const andonParametersDatabase: AndonParameterItem[] = [...INITIAL_ANDON_PARAMETERS];

export const qualityAndonService = {
  async getAndonDashboardData(): Promise<AndonDashboardData> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    return {
      kpis: {
        activeAlarms: { count: 5, subtext: "Across 3 lines" },
        qcChecks: { count: 1248, trendPct: 12.4 },
        outOfSpec: { count: 32, trendPct: 8.5 },
        passRate: { percentage: 97.43, trendPct: 1.2 },
        openCapa: { count: 12, subtext: "Require action" },
      },
      liveBoard: [
        {
          id: "board-1",
          lineName: "Line A - Filling",
          status: "alarm",
          lastAlarmTime: "10:35:22",
          alarmType: "OOS - Weight",
          duration: "00:12:34",
          parameterId: "param-04",
        },
        {
          id: "board-2",
          lineName: "Line B - Packaging",
          status: "warning",
          lastAlarmTime: "10:31:05",
          alarmType: "OOS - Seal Integrity",
          duration: "00:05:18",
          parameterId: "param-07",
        },
        {
          id: "board-3",
          lineName: "Line C - Blister",
          status: "normal",
          lastAlarmTime: "-",
          alarmType: "-",
          duration: "-",
        },
        {
          id: "board-4",
          lineName: "Line D - Cartoning",
          status: "alarm",
          lastAlarmTime: "10:28:44",
          alarmType: "OOS - Barcode Read",
          duration: "00:09:51",
          parameterId: "param-06",
        },
        {
          id: "board-5",
          lineName: "Warehouse Sampling",
          status: "normal",
          lastAlarmTime: "-",
          alarmType: "-",
          duration: "-",
        },
      ],
      hourlyTrends: [
        { hour: "00:00", critical: 0, major: 0, minor: 4 },
        { hour: "02:00", critical: 0, major: 3, minor: 5 },
        { hour: "04:00", critical: 0, major: 5, minor: 7 },
        { hour: "06:00", critical: 0, major: 7, minor: 11 },
        { hour: "08:00", critical: 12, major: 16, minor: 12 },
        { hour: "10:00", critical: 10, major: 14, minor: 11 },
        { hour: "12:00", critical: 8, major: 9, minor: 15 },
        { hour: "14:00", critical: 7, major: 9, minor: 8 },
        { hour: "16:00", critical: 9, major: 11, minor: 6 },
        { hour: "18:00", critical: 14, major: 10, minor: 8 },
        { hour: "20:00", critical: 6, major: 5, minor: 4 },
        { hour: "22:00", critical: 4, major: 2, minor: 2 },
      ],
      recentAlarms: [
        {
          id: "rec-1",
          title: "OOS - Weight Out of Range",
          severity: "critical",
          lineName: "Line A - Filling",
          productName: "Paracetamol 500mg",
          timestamp: "10:35:22",
          relativeTime: "12 min ago",
          parameterId: "param-04",
        },
        {
          id: "rec-2",
          title: "Seal Integrity Out of Spec",
          severity: "major",
          lineName: "Line B - Packaging",
          productName: "Amoxicillin 250mg",
          timestamp: "10:31:05",
          relativeTime: "16 min ago",
          parameterId: "param-07",
        },
        {
          id: "rec-3",
          title: "Barcode Read Failure",
          severity: "critical",
          lineName: "Line D - Cartoning",
          productName: "Cough Syrup 100ml",
          timestamp: "10:28:44",
          relativeTime: "19 min ago",
          parameterId: "param-06",
        },
      ],
      qualityDistribution: {
        passCount: 1216,
        passPct: 97.43,
        warningCount: 18,
        warningPct: 1.44,
        failCount: 14,
        failPct: 1.13,
      },
      capaSummary: {
        open: 12,
        inProgress: 7,
        pendingVerification: 4,
        closedThisMonth: 23,
      },
      parameters: andonParametersDatabase,
    };
  },

  async getAndonParameters(params?: AndonFilterParams): Promise<AndonListResponse> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 10;
    const search = params?.search?.toLowerCase().trim() ?? "";
    const status = params?.status ?? "all";
    const lineId = params?.line_id ?? "all";
    const category = params?.category ?? "all";

    let filtered = [...andonParametersDatabase];

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.code.toLowerCase().includes(search) ||
          p.batchNumber.toLowerCase().includes(search) ||
          p.workOrderCode.toLowerCase().includes(search) ||
          p.operatorName.toLowerCase().includes(search) ||
          p.productName.toLowerCase().includes(search),
      );
    }

    if (status !== "all") {
      filtered = filtered.filter((p) => p.status === status);
    }

    if (lineId !== "all" && lineId) {
      filtered = filtered.filter((p) => p.lineId === lineId);
    }

    if (category !== "all" && category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedData = filtered.slice(startIndex, startIndex + perPage);

    return {
      data: paginatedData,
      meta: {
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
        },
      },
    };
  },

  async getParameterById(id: string): Promise<AndonParameterItem> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = andonParametersDatabase.find((p) => p.id === id);
    if (!found) {
      throw new Error(`Parameter with ID "${id}" not found.`);
    }
    return found;
  },

  async acknowledgeAlarm(input: AcknowledgeAlarmInput): Promise<AndonParameterItem> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = andonParametersDatabase.findIndex((p) => p.id === input.parameterId);
    if (index === -1) {
      throw new Error("Parameter not found.");
    }

    const current = andonParametersDatabase[index];
    const now = new Date().toISOString();

    const newAudit = {
      id: `aud-${Date.now()}`,
      timestamp: now,
      actorName: input.actorName,
      actorRole: "Production Operator",
      action: `Acknowledged Andon Alarm for ${current.code}`,
      details: input.notes || "Acknowledged and in-process containment initiated.",
      signatureHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    };

    const updated: AndonParameterItem = {
      ...current,
      isAcknowledged: true,
      acknowledgedBy: input.actorName,
      acknowledgedAt: now,
      auditLogs: [newAudit, ...current.auditLogs],
    };

    andonParametersDatabase[index] = updated;
    return updated;
  },

  async escalateToQA(input: EscalateToQAInput): Promise<AndonParameterItem> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const index = andonParametersDatabase.findIndex((p) => p.id === input.parameterId);
    if (index === -1) {
      throw new Error("Parameter not found.");
    }

    const current = andonParametersDatabase[index];
    const now = new Date().toISOString();
    const incidentCode = `DEV-2026-${String(current.incidents.length + 90).padStart(4, "0")}`;

    const newIncident: QualityDeviationIncident = {
      id: `inc-${Date.now()}`,
      code: incidentCode,
      title: `Escalated Deviation: ${current.name}`,
      description: input.message,
      severity: input.urgency === "critical" ? "critical" : "major",
      status: "open",
      loggedAt: now,
      loggedBy: input.reportedBy,
      qaAssignedTo: input.targetQAPerson || current.qaInspectorName,
      isCapaRequired: true,
    };

    const newAudit = {
      id: `aud-${Date.now()}`,
      timestamp: now,
      actorName: input.reportedBy,
      actorRole: "Responsible Pharmacist",
      action: `Escalated Quality Alarm to QA (${input.urgency.toUpperCase()})`,
      details: `Created Incident ${incidentCode}: ${input.message}`,
      signatureHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    };

    const updated: AndonParameterItem = {
      ...current,
      incidents: [newIncident, ...current.incidents],
      auditLogs: [newAudit, ...current.auditLogs],
    };

    andonParametersDatabase[index] = updated;
    return updated;
  },

  async logQualityIncident(input: LogQualityIncidentInput): Promise<AndonParameterItem> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = andonParametersDatabase.findIndex((p) => p.id === input.parameterId);
    if (index === -1) {
      throw new Error("Parameter not found.");
    }

    const current = andonParametersDatabase[index];
    const now = new Date().toISOString();
    const incidentCode = `DEV-2026-${String(current.incidents.length + 80).padStart(4, "0")}`;

    const newIncident: QualityDeviationIncident = {
      id: `inc-${Date.now()}`,
      code: incidentCode,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: "open",
      loggedAt: now,
      loggedBy: input.loggedBy,
      qaAssignedTo: current.qaInspectorName,
      correctiveAction: input.correctiveAction,
      isCapaRequired: input.isCapaRequired ?? false,
    };

    const newAudit = {
      id: `aud-${Date.now()}`,
      timestamp: now,
      actorName: input.loggedBy,
      actorRole: "Production Operator",
      action: `Logged Quality Incident ${incidentCode}`,
      details: input.title,
      signatureHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    };

    const updated: AndonParameterItem = {
      ...current,
      incidents: [newIncident, ...current.incidents],
      auditLogs: [newAudit, ...current.auditLogs],
    };

    andonParametersDatabase[index] = updated;
    return updated;
  },
};
