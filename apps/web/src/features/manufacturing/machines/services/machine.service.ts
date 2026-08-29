import type {
  CreateIncidentInput,
  MachineDetail,
  MachineFilterParams,
  MachineIncidentLog,
  MachineItem,
  MachineStatus,
  MachineSummaryKpis,
  MachineTelemetryPoint,
  MachineTimelineBlock,
  UpdateMachineStatusInput,
} from "../types/machine.types";
import { getSensorStatus } from "../utils/machine.utils";

function generateTelemetryTrend(
  baseTemp: number,
  baseVib: number,
  status: MachineStatus
): MachineTelemetryPoint[] {
  const times = [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
  ];

  return times.map((t, idx) => {
    let tOffset = Math.sin(idx * 0.5) * 3.5;
    let vOffset = Math.cos(idx * 0.4) * 0.4;
    let pointStatus: MachineStatus = "running";

    if (idx === 6 || idx === 7) {
      if (status === "downtime") {
        tOffset += 18.0;
        vOffset += 2.8;
        pointStatus = "downtime";
      }
    } else if (idx === 12) {
      pointStatus = "idle";
      tOffset -= 8.0;
      vOffset = 0.2;
    } else if (idx === 18) {
      pointStatus = "maintenance";
      tOffset -= 12.0;
      vOffset = 0.1;
    }

    const temp = Math.max(25, Number((baseTemp + tOffset).toFixed(1)));
    const vib = Math.max(0.1, Number((baseVib + vOffset).toFixed(2)));
    const rpm = pointStatus === "running" ? 3200 + Math.round(tOffset * 20) : pointStatus === "idle" ? 400 : 0;
    const power = pointStatus === "running" ? Number((38.5 + tOffset * 0.3).toFixed(1)) : 2.5;

    return {
      time: t,
      temperature: temp,
      vibration: vib,
      rpm,
      power,
      status: pointStatus,
    };
  });
}

function generate24hTimeline(status: MachineStatus): MachineTimelineBlock[] {
  if (status === "downtime") {
    return [
      { id: "tb-1", start: "00:00", end: "04:00", durationMinutes: 240, status: "running" },
      { id: "tb-2", start: "04:00", end: "04:30", durationMinutes: 30, status: "idle", reason: "Material Feeding Delay" },
      { id: "tb-3", start: "04:30", end: "08:15", durationMinutes: 225, status: "running" },
      { id: "tb-4", start: "08:15", end: "10:30", durationMinutes: 135, status: "downtime", reason: "Hydraulic Pump Overheat", category: "Unplanned Breakdown" },
      { id: "tb-5", start: "10:30", end: "12:00", durationMinutes: 90, status: "maintenance", reason: "Technician Inspection", category: "Planned Maintenance" },
      { id: "tb-6", start: "12:00", end: "13:00", durationMinutes: 60, status: "idle", reason: "Shift Changeover" },
      { id: "tb-7", start: "13:00", end: "19:00", durationMinutes: 360, status: "running" },
      { id: "tb-8", start: "19:00", end: "24:00", durationMinutes: 300, status: "downtime", reason: "Spindle Sensor Alarm", category: "Unplanned Breakdown" },
    ];
  }

  if (status === "maintenance") {
    return [
      { id: "tb-1", start: "00:00", end: "08:00", durationMinutes: 480, status: "running" },
      { id: "tb-2", start: "08:00", end: "14:00", durationMinutes: 360, status: "maintenance", reason: "Quarterly Calibration & Oil Flushing", category: "Planned Maintenance" },
      { id: "tb-3", start: "14:00", end: "24:00", durationMinutes: 600, status: "running" },
    ];
  }

  return [
    { id: "tb-1", start: "00:00", end: "06:00", durationMinutes: 360, status: "running" },
    { id: "tb-2", start: "06:00", end: "06:20", durationMinutes: 20, status: "idle", reason: "Tooling Calibration" },
    { id: "tb-3", start: "06:20", end: "12:00", durationMinutes: 340, status: "running" },
    { id: "tb-4", start: "12:00", end: "12:45", durationMinutes: 45, status: "idle", reason: "Lunch & Shift Handover" },
    { id: "tb-5", start: "12:45", end: "18:00", durationMinutes: 315, status: "running" },
    { id: "tb-6", start: "18:00", end: "18:30", durationMinutes: 30, status: "maintenance", reason: "Filter Cleaning & Lube", category: "Planned Maintenance" },
    { id: "tb-7", start: "18:30", end: "24:00", durationMinutes: 330, status: "running" },
  ];
}

const INITIAL_MACHINES: MachineDetail[] = [
  {
    id: "MCH-INJ-01",
    name: "Engel e-mac 310 Injection Press",
    code: "INJ-310",
    imageUrl: "/images/machines/inj-310.svg",
    lineId: "LINE-A",
    lineName: "Line A - Injection Molding",
    status: "running",
    oeeScore: 88.5,
    availabilityScore: 94.0,
    performanceScore: 96.2,
    qualityScore: 97.8,
    partsPerHour: 248,
    targetPartsPerHour: 260,
    healthIndex: 94,
    currentTelemetry: {
      temperature: 72.4,
      temperatureStatus: "normal",
      vibration: 1.8,
      vibrationStatus: "normal",
      pressure: 142.5,
      spindleRpm: 3450,
      powerDraw: 41.2,
      cycleTimeSeconds: 14.5,
      cycleEfficiency: 96.5,
    },
    assignedOperator: {
      name: "Rian Hidayat",
      avatarSeed: "Rian Hidayat",
      role: "Senior Machine Operator",
      shift: "Shift 1 (07:00 - 15:00)",
      phone: "+62 812-3344-5566",
    },
    assignedTechnician: {
      name: "Budi Santoso",
      avatarSeed: "Budi Santoso",
      role: "Lead Maintenance Engineer",
      shift: "Regular (08:00 - 17:00)",
      phone: "+62 811-9876-5432",
    },
    technicalSpecs: {
      model: "Engel e-mac 310 / 100",
      serialNumber: "ENG-2024-99812",
      manufacturer: "Engel Machinery GmbH (Austria)",
      installationDate: "2024-03-15",
      lastServiceDate: "2026-08-10",
      nextScheduledService: "2026-09-10",
      powerRating: "55 kW",
      maxCapacity: "320 parts/hr",
    },
    activeWorkOrder: {
      id: "WO-89101",
      code: "WO-89101",
      productName: "Automotive Dashboard Frame A2",
      sku: "AUTO-DASH-A2",
      targetQuantity: 3000,
      completedQuantity: 2450,
      scrapQuantity: 32,
      progressPercentage: 81.6,
    },
    mtbfHours: 168.4,
    mttrMinutes: 28,
    totalDowntimeTodayMinutes: 35,
    totalIncidentsMonth: 2,
    recentTimelineBlocks: generate24hTimeline("running"),
    timeline24h: generate24hTimeline("running"),
    telemetryTrend: generateTelemetryTrend(72.4, 1.8, "running"),
    incidentLogs: [
      {
        id: "INC-2026-01",
        machineId: "MCH-INJ-01",
        machineName: "Engel e-mac 310 Injection Press",
        lineId: "LINE-A",
        lineName: "Line A",
        startTime: "2026-08-29 06:15",
        endTime: "2026-08-29 06:35",
        durationMinutes: 20,
        status: "downtime",
        reason: "Nozzle Jam / Material Clog",
        category: "Unplanned Breakdown",
        severity: "medium",
        reportedBy: "Rian Hidayat",
        reportedByAvatar: "Rian Hidayat",
        actionTaken: "Purged barrel with cleaning resin and adjusted temperature zone 3 by +5°C.",
        resolutionStatus: "resolved",
      },
      {
        id: "INC-2026-02",
        machineId: "MCH-INJ-01",
        machineName: "Engel e-mac 310 Injection Press",
        lineId: "LINE-A",
        lineName: "Line A",
        startTime: "2026-08-28 11:00",
        endTime: "2026-08-28 11:15",
        durationMinutes: 15,
        status: "maintenance",
        reason: "Scheduled Mold Cleaning & Core Pin Lube",
        category: "Tooling / Mold Change",
        severity: "low",
        reportedBy: "Budi Santoso",
        reportedByAvatar: "Budi Santoso",
        actionTaken: "Cleaned core cavity and inspected hydraulic clamp pressure.",
        resolutionStatus: "resolved",
      },
    ],
  },
  {
    id: "MCH-INJ-02",
    name: "Sumitomo SH200 Mold Press",
    code: "INJ-200",
    imageUrl: "/images/machines/inj-200.svg",
    lineId: "LINE-A",
    lineName: "Line A - Injection Molding",
    status: "downtime",
    oeeScore: 42.1,
    availabilityScore: 55.0,
    performanceScore: 82.0,
    qualityScore: 93.4,
    partsPerHour: 14,
    targetPartsPerHour: 220,
    healthIndex: 48,
    currentTelemetry: {
      temperature: 91.2,
      temperatureStatus: "critical",
      vibration: 4.8,
      vibrationStatus: "critical",
      pressure: 98.0,
      spindleRpm: 120,
      powerDraw: 18.5,
      cycleTimeSeconds: 38.0,
      cycleEfficiency: 45.0,
    },
    assignedOperator: {
      name: "Aris Munandar",
      avatarSeed: "Aris Munandar",
      role: "Machine Operator",
      shift: "Shift 1 (07:00 - 15:00)",
      phone: "+62 813-2211-9988",
    },
    assignedTechnician: {
      name: "Hendra Wijaya",
      avatarSeed: "Hendra Wijaya",
      role: "Hydraulic Maintenance Specialist",
      shift: "Regular (08:00 - 17:00)",
      phone: "+62 812-8877-6655",
    },
    technicalSpecs: {
      model: "Sumitomo SH200-EVO All-Electric",
      serialNumber: "SUM-SH200-8819",
      manufacturer: "Sumitomo Heavy Industries (Japan)",
      installationDate: "2023-09-20",
      lastServiceDate: "2026-07-28",
      nextScheduledService: "2026-08-28",
      powerRating: "48 kW",
      maxCapacity: "250 parts/hr",
    },
    activeWorkOrder: {
      id: "WO-89104",
      code: "WO-89104",
      productName: "HVAC Blower Fan Housing",
      sku: "HVAC-FAN-H2",
      targetQuantity: 2500,
      completedQuantity: 820,
      scrapQuantity: 112,
      progressPercentage: 32.8,
    },
    mtbfHours: 42.5,
    mttrMinutes: 98,
    totalDowntimeTodayMinutes: 225,
    totalIncidentsMonth: 6,
    recentTimelineBlocks: generate24hTimeline("downtime"),
    timeline24h: generate24hTimeline("downtime"),
    telemetryTrend: generateTelemetryTrend(91.2, 4.8, "downtime"),
    incidentLogs: [
      {
        id: "INC-2026-03",
        machineId: "MCH-INJ-02",
        machineName: "Sumitomo SH200 Mold Press",
        lineId: "LINE-A",
        lineName: "Line A",
        startTime: "2026-08-29 08:30",
        durationMinutes: 105,
        status: "downtime",
        reason: "Hydraulic Pump Motor Overheat (>90°C)",
        category: "Unplanned Breakdown",
        severity: "critical",
        reportedBy: "Aris Munandar",
        reportedByAvatar: "Aris Munandar",
        actionTaken: "Emergency stop engaged. Maintenance technician is replacing the faulty auxiliary cooling fan unit.",
        resolutionStatus: "in_progress",
      },
      {
        id: "INC-2026-04",
        machineId: "MCH-INJ-02",
        machineName: "Sumitomo SH200 Mold Press",
        lineId: "LINE-A",
        lineName: "Line A",
        startTime: "2026-08-27 13:00",
        endTime: "2026-08-27 15:00",
        durationMinutes: 120,
        status: "downtime",
        reason: "Spindle Motor Bearing Noise & High Vibration",
        category: "Unplanned Breakdown",
        severity: "high",
        reportedBy: "Hendra Wijaya",
        reportedByAvatar: "Hendra Wijaya",
        actionTaken: "Lubricated main drive bearing and re-aligned belt tension.",
        resolutionStatus: "resolved",
      },
    ],
  },
  {
    id: "MCH-CNC-01",
    name: "Haas VF-2SS Vertical Machining Center",
    code: "CNC-V01",
    imageUrl: "/images/machines/cnc-v01.svg",
    lineId: "LINE-B",
    lineName: "Line B - CNC Precision Machining",
    status: "running",
    oeeScore: 81.0,
    availabilityScore: 90.0,
    performanceScore: 92.0,
    qualityScore: 97.8,
    partsPerHour: 45,
    targetPartsPerHour: 50,
    healthIndex: 88,
    currentTelemetry: {
      temperature: 76.5,
      temperatureStatus: "warning",
      vibration: 2.3,
      vibrationStatus: "normal",
      pressure: 85.0,
      spindleRpm: 12000,
      powerDraw: 22.4,
      cycleTimeSeconds: 78.0,
      cycleEfficiency: 92.5,
    },
    assignedOperator: {
      name: "Bambang Kurnia",
      avatarSeed: "Bambang Kurnia",
      role: "CNC Programmer & Operator",
      shift: "Shift 1 (07:00 - 15:00)",
      phone: "+62 817-5544-3322",
    },
    assignedTechnician: {
      name: "Agus Setiawan",
      avatarSeed: "Agus Setiawan",
      role: "Precision Machining Supervisor",
      shift: "Regular (08:00 - 17:00)",
      phone: "+62 815-1122-3344",
    },
    technicalSpecs: {
      model: "Haas VF-2SS Super-Speed VMC",
      serialNumber: "HAAS-VF2SS-40291",
      manufacturer: "Haas Automation, Inc. (USA)",
      installationDate: "2024-01-10",
      lastServiceDate: "2026-08-05",
      nextScheduledService: "2026-09-05",
      powerRating: "30 kW",
      maxCapacity: "60 parts/hr",
    },
    activeWorkOrder: {
      id: "WO-89102",
      code: "WO-89102",
      productName: "Precision Gear Housing Aluminum",
      sku: "ALU-GEAR-H1",
      targetQuantity: 800,
      completedQuantity: 520,
      scrapQuantity: 18,
      progressPercentage: 65.0,
    },
    mtbfHours: 124.0,
    mttrMinutes: 32,
    totalDowntimeTodayMinutes: 30,
    totalIncidentsMonth: 3,
    recentTimelineBlocks: generate24hTimeline("running"),
    timeline24h: generate24hTimeline("running"),
    telemetryTrend: generateTelemetryTrend(76.5, 2.3, "running"),
    incidentLogs: [
      {
        id: "INC-2026-05",
        machineId: "MCH-CNC-01",
        machineName: "Haas VF-2SS Vertical Machining Center",
        lineId: "LINE-B",
        lineName: "Line B",
        startTime: "2026-08-29 09:40",
        endTime: "2026-08-29 10:10",
        durationMinutes: 30,
        status: "downtime",
        reason: "End Mill 6mm Carbide Tool Snap",
        category: "Tooling / Mold Change",
        severity: "medium",
        reportedBy: "Bambang Kurnia",
        reportedByAvatar: "Bambang Kurnia",
        actionTaken: "Replaced broken end mill cutter, zeroed tool touch-probe and resumed cycle.",
        resolutionStatus: "resolved",
      },
    ],
  },
  {
    id: "MCH-CNC-02",
    name: "Mazak Integrex i-200S Multi-Tasking",
    code: "CNC-M02",
    imageUrl: "/images/machines/cnc-m02.svg",
    lineId: "LINE-B",
    lineName: "Line B - CNC Precision Machining",
    status: "downtime",
    oeeScore: 62.5,
    availabilityScore: 70.0,
    performanceScore: 91.0,
    qualityScore: 98.2,
    partsPerHour: 18,
    targetPartsPerHour: 35,
    healthIndex: 59,
    currentTelemetry: {
      temperature: 84.8,
      temperatureStatus: "warning",
      vibration: 3.9,
      vibrationStatus: "warning",
      pressure: 45.2,
      spindleRpm: 0,
      powerDraw: 5.2,
      cycleTimeSeconds: 192.0,
      cycleEfficiency: 68.0,
    },
    assignedOperator: {
      name: "Dimas Anggara",
      avatarSeed: "Dimas Anggara",
      role: "Multi-Axis CNC Specialist",
      shift: "Shift 1 (07:00 - 15:00)",
      phone: "+62 819-4433-2211",
    },
    assignedTechnician: {
      name: "Agus Setiawan",
      avatarSeed: "Agus Setiawan",
      role: "Precision Machining Supervisor",
      shift: "Regular (08:00 - 17:00)",
      phone: "+62 815-1122-3344",
    },
    technicalSpecs: {
      model: "Mazak Integrex i-200S Twin Spindle",
      serialNumber: "MZK-INT-200S-1092",
      manufacturer: "Yamazaki Mazak Corp (Japan)",
      installationDate: "2023-11-12",
      lastServiceDate: "2026-07-20",
      nextScheduledService: "2026-08-30",
      powerRating: "42 kW",
      maxCapacity: "40 parts/hr",
    },
    activeWorkOrder: {
      id: "WO-89106",
      code: "WO-89106",
      productName: "Fuel Rail Injector Flange",
      sku: "FUEL-FLG-X1",
      targetQuantity: 1200,
      completedQuantity: 0,
      scrapQuantity: 0,
      progressPercentage: 0,
    },
    mtbfHours: 65.2,
    mttrMinutes: 75,
    totalDowntimeTodayMinutes: 135,
    totalIncidentsMonth: 4,
    recentTimelineBlocks: generate24hTimeline("downtime"),
    timeline24h: generate24hTimeline("downtime"),
    telemetryTrend: generateTelemetryTrend(84.8, 3.9, "downtime"),
    incidentLogs: [
      {
        id: "INC-2026-06",
        machineId: "MCH-CNC-02",
        machineName: "Mazak Integrex i-200S",
        lineId: "LINE-B",
        lineName: "Line B",
        startTime: "2026-08-29 07:15",
        durationMinutes: 135,
        status: "downtime",
        reason: "Coolant Fluid Pressure Sensor Malfunction & Low Flow",
        category: "Unplanned Breakdown",
        severity: "high",
        reportedBy: "Dimas Anggara",
        reportedByAvatar: "Dimas Anggara",
        actionTaken: "Flushing high pressure coolant circuit line and cleaning pressure sensor diaphragm.",
        resolutionStatus: "in_progress",
      },
    ],
  },
  {
    id: "MCH-STP-01",
    name: "AIDA NC2-2000 High-Speed Stamping",
    code: "STP-200",
    imageUrl: "/images/machines/stp-200.svg",
    lineId: "LINE-C",
    lineName: "Line C - Metal Stamping Press",
    status: "running",
    oeeScore: 92.4,
    availabilityScore: 96.0,
    performanceScore: 97.1,
    qualityScore: 99.2,
    partsPerHour: 850,
    targetPartsPerHour: 900,
    healthIndex: 96,
    currentTelemetry: {
      temperature: 65.4,
      temperatureStatus: "normal",
      vibration: 2.0,
      vibrationStatus: "normal",
      pressure: 210.0,
      spindleRpm: 180,
      powerDraw: 65.0,
      cycleTimeSeconds: 4.2,
      cycleEfficiency: 98.0,
    },
    assignedOperator: {
      name: "Suryadi",
      avatarSeed: "Suryadi",
      role: "Stamping Press Specialist",
      shift: "Shift 1 (07:00 - 15:00)",
      phone: "+62 813-7788-9900",
    },
    assignedTechnician: {
      name: "Hendra Wijaya",
      avatarSeed: "Hendra Wijaya",
      role: "Hydraulic & Mechanical Specialist",
      shift: "Regular (08:00 - 17:00)",
      phone: "+62 812-8877-6655",
    },
    technicalSpecs: {
      model: "AIDA NC2-2000 (200-Ton 2-Point)",
      serialNumber: "AIDA-NC2-200-7711",
      manufacturer: "Aida Engineering, Ltd. (Japan)",
      installationDate: "2023-05-18",
      lastServiceDate: "2026-08-12",
      nextScheduledService: "2026-09-12",
      powerRating: "75 kW",
      maxCapacity: "1000 parts/hr",
    },
    activeWorkOrder: {
      id: "WO-89103",
      code: "WO-89103",
      productName: "Chassis Bracket Steel 3mm",
      sku: "STL-BRK-03",
      targetQuantity: 10000,
      completedQuantity: 9400,
      scrapQuantity: 75,
      progressPercentage: 94.0,
    },
    mtbfHours: 210.0,
    mttrMinutes: 18,
    totalDowntimeTodayMinutes: 15,
    totalIncidentsMonth: 1,
    recentTimelineBlocks: generate24hTimeline("running"),
    timeline24h: generate24hTimeline("running"),
    telemetryTrend: generateTelemetryTrend(65.4, 2.0, "running"),
    incidentLogs: [
      {
        id: "INC-2026-07",
        machineId: "MCH-STP-01",
        machineName: "AIDA NC2-2000 High-Speed Stamping",
        lineId: "LINE-C",
        lineName: "Line C",
        startTime: "2026-08-29 10:00",
        endTime: "2026-08-29 10:15",
        durationMinutes: 15,
        status: "maintenance",
        reason: "Die Calibration & Progressive Lubrication",
        category: "Planned Maintenance",
        severity: "low",
        reportedBy: "Suryadi",
        reportedByAvatar: "Suryadi",
        actionTaken: "Verified die clearance and refilled automatic centralized grease reservoir.",
        resolutionStatus: "resolved",
      },
    ],
  },
  {
    id: "MCH-ASM-01",
    name: "KUKA KR 10 R1100 Robotic Cell",
    code: "ROB-K01",
    imageUrl: "/images/machines/rob-k01.svg",
    lineId: "LINE-D",
    lineName: "Line D - Robotic Assembly",
    status: "idle",
    oeeScore: 72.4,
    availabilityScore: 80.0,
    performanceScore: 92.5,
    qualityScore: 97.8,
    partsPerHour: 0,
    targetPartsPerHour: 110,
    healthIndex: 82,
    currentTelemetry: {
      temperature: 55.0,
      temperatureStatus: "normal",
      vibration: 0.8,
      vibrationStatus: "normal",
      pressure: 6.2,
      spindleRpm: 0,
      powerDraw: 4.8,
      cycleTimeSeconds: 32.0,
      cycleEfficiency: 88.0,
    },
    assignedOperator: {
      name: "Dewi Lestari",
      avatarSeed: "Dewi Lestari",
      role: "Automation & Robotics Lead",
      shift: "Shift 1 (07:00 - 15:00)",
      phone: "+62 818-9900-1122",
    },
    assignedTechnician: {
      name: "Budi Santoso",
      avatarSeed: "Budi Santoso",
      role: "Lead Maintenance Engineer",
      shift: "Regular (08:00 - 17:00)",
      phone: "+62 811-9876-5432",
    },
    technicalSpecs: {
      model: "KUKA KR 10 R1100-2 cybertech nano",
      serialNumber: "KUKA-KR10-44910",
      manufacturer: "KUKA AG (Germany)",
      installationDate: "2024-04-01",
      lastServiceDate: "2026-08-11",
      nextScheduledService: "2026-09-11",
      powerRating: "15 kW",
      maxCapacity: "120 cycles/hr",
    },
    activeWorkOrder: {
      id: "WO-89105",
      code: "WO-89105",
      productName: "EV Battery Terminal Shield",
      sku: "EV-SHLD-T9",
      targetQuantity: 1500,
      completedQuantity: 1500,
      scrapQuantity: 14,
      progressPercentage: 100,
    },
    mtbfHours: 195.0,
    mttrMinutes: 24,
    totalDowntimeTodayMinutes: 60,
    totalIncidentsMonth: 2,
    recentTimelineBlocks: generate24hTimeline("idle"),
    timeline24h: generate24hTimeline("idle"),
    telemetryTrend: generateTelemetryTrend(55.0, 0.8, "idle"),
    incidentLogs: [
      {
        id: "INC-2026-08",
        machineId: "MCH-ASM-01",
        machineName: "KUKA KR 10 R1100 Robotic Cell",
        lineId: "LINE-D",
        lineName: "Line D",
        startTime: "2026-08-29 14:00",
        durationMinutes: 60,
        status: "idle",
        reason: "Waiting for Incoming Sub-Assembly Components Batch #B4",
        category: "Material Shortage",
        severity: "medium",
        reportedBy: "Dewi Lestari",
        reportedByAvatar: "Dewi Lestari",
        actionTaken: "Notified internal warehouse logistics team for priority dispatch.",
        resolutionStatus: "in_progress",
      },
    ],
  },
];

const machinesCache: MachineDetail[] = [...INITIAL_MACHINES];

export async function fetchMachines(
  filters?: MachineFilterParams
): Promise<MachineItem[]> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));

  return machinesCache.filter((m) => {
    if (filters?.lineId && filters.lineId !== "all" && m.lineId !== filters.lineId) {
      return false;
    }
    if (filters?.status && filters.status !== "all" && m.status !== filters.status) {
      return false;
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      const match =
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.lineName.toLowerCase().includes(q) ||
        m.assignedOperator.name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export async function fetchMachineById(id: string): Promise<MachineDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const machine = machinesCache.find((m) => m.id === id || m.code.toLowerCase() === id.toLowerCase());
  if (!machine) return null;
  return { ...machine };
}

export async function fetchMachinesSummary(): Promise<MachineSummaryKpis> {
  const total = machinesCache.length;
  const running = machinesCache.filter((m) => m.status === "running").length;
  const idle = machinesCache.filter((m) => m.status === "idle").length;
  const downtime = machinesCache.filter((m) => m.status === "downtime").length;
  const maintenance = machinesCache.filter((m) => m.status === "maintenance").length;

  const totalHealth = machinesCache.reduce((acc, curr) => acc + curr.healthIndex, 0);
  const totalOee = machinesCache.reduce((acc, curr) => acc + curr.oeeScore, 0);

  return {
    totalMachines: total,
    runningCount: running,
    idleCount: idle,
    downtimeCount: downtime,
    maintenanceCount: maintenance,
    averageHealthIndex: total > 0 ? Number((totalHealth / total).toFixed(1)) : 0,
    averageOeeScore: total > 0 ? Number((totalOee / total).toFixed(1)) : 0,
  };
}

export async function createMachineIncident(
  input: CreateIncidentInput
): Promise<MachineIncidentLog> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const machineIndex = machinesCache.findIndex((m) => m.id === input.machineId);
  const targetMachine = machineIndex >= 0 ? machinesCache[machineIndex] : null;

  const newIncident: MachineIncidentLog = {
    id: `INC-${Date.now()}`,
    machineId: input.machineId,
    machineName: targetMachine ? targetMachine.name : "Machine",
    lineId: targetMachine ? targetMachine.lineId : "LINE-A",
    lineName: targetMachine ? targetMachine.lineName : "Production Line",
    startTime: input.startTime,
    durationMinutes: input.durationMinutes,
    status: "downtime",
    reason: input.reason,
    category: input.category,
    severity: input.severity,
    reportedBy: input.reportedBy,
    reportedByAvatar: input.reportedBy,
    actionTaken: input.actionTaken,
    resolutionStatus: "open",
  };

  if (machineIndex >= 0 && targetMachine) {
    const updatedIncidents = [newIncident, ...targetMachine.incidentLogs];
    const updatedStatus: MachineStatus = "downtime";
    const updatedHealth = Math.max(20, targetMachine.healthIndex - 15);
    const updatedTemp = Math.max(targetMachine.currentTelemetry.temperature, 88.5);
    const updatedVib = Math.max(targetMachine.currentTelemetry.vibration, 4.2);

    const updatedTimelineBlock: MachineTimelineBlock = {
      id: `tb-${Date.now()}`,
      start: input.startTime.split(" ")[1] || "15:00",
      end: "24:00",
      durationMinutes: input.durationMinutes,
      status: "downtime",
      reason: input.reason,
      category: input.category,
    };

    machinesCache[machineIndex] = {
      ...targetMachine,
      status: updatedStatus,
      healthIndex: updatedHealth,
      currentTelemetry: {
        ...targetMachine.currentTelemetry,
        temperature: updatedTemp,
        temperatureStatus: getSensorStatus(updatedTemp, "temperature"),
        vibration: updatedVib,
        vibrationStatus: getSensorStatus(updatedVib, "vibration"),
      },
      totalDowntimeTodayMinutes: targetMachine.totalDowntimeTodayMinutes + input.durationMinutes,
      totalIncidentsMonth: targetMachine.totalIncidentsMonth + 1,
      incidentLogs: updatedIncidents,
      timeline24h: [updatedTimelineBlock, ...targetMachine.timeline24h],
      recentTimelineBlocks: [updatedTimelineBlock, ...targetMachine.recentTimelineBlocks],
    };
  }

  return newIncident;
}

export async function updateMachineStatus(
  input: UpdateMachineStatusInput
): Promise<MachineDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const machineIndex = machinesCache.findIndex((m) => m.id === input.machineId);
  if (machineIndex < 0) return null;

  const targetMachine = machinesCache[machineIndex];
  const newHealth =
    input.status === "running"
      ? Math.min(98, targetMachine.healthIndex + 15)
      : input.status === "maintenance"
      ? 75
      : targetMachine.healthIndex;

  machinesCache[machineIndex] = {
    ...targetMachine,
    status: input.status,
    healthIndex: newHealth,
  };

  return { ...machinesCache[machineIndex] };
}
