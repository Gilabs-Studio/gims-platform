import type {
  CreateDeviationInput,
  CreateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  WorkOrder,
  WorkOrderFilterParams,
  WorkOrderListResponse,
} from "../types/work-order.types";

const INITIAL_MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo-pharm-001",
    code: "WO-2026-0801",
    batchNumber: "BATCH-PCT-2608-01",
    productName: "Paracetamol 500mg Film-Coated Tablet",
    productCode: "PRD-PCT-500",
    lineId: "LINE-1",
    lineName: "Line 1 - Granulation & Tableting",
    machineId: "MCH-TAB-01",
    machineName: "Fette 2090i Rotary Tablet Press",
    targetQuantity: 100000,
    completedQuantity: 84500,
    scrapQuantity: 320,
    unit: "Tablets",
    status: "in_progress",
    batchStatus: "in_production",
    operatorId: "emp-01",
    operatorName: "Ahmad Pratama",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ahmad",
    operatorRole: "Senior Production Pharmacist",
    startDate: "2026-08-28T07:00:00Z",
    estimatedEndDate: "2026-08-29T18:00:00Z",
    notes: "Batch validation run for new tablet punch tooling.",
    materials: [
      {
        id: "mat-01",
        materialCode: "API-PCT-01",
        materialName: "Paracetamol Active Powder Micronized",
        requiredQty: 50.0,
        consumedQty: 42.5,
        unit: "kg",
        lotNumber: "LOT-API-2026-0814",
      },
      {
        id: "mat-02",
        materialCode: "EXC-MCC-102",
        materialName: "Microcrystalline Cellulose PH-102",
        requiredQty: 18.5,
        consumedQty: 15.7,
        unit: "kg",
        lotNumber: "LOT-EXC-2026-0722",
      },
      {
        id: "mat-03",
        materialCode: "EXC-MGS-01",
        materialName: "Magnesium Stearate Pharma Grade",
        requiredQty: 1.2,
        consumedQty: 1.0,
        unit: "kg",
        lotNumber: "LOT-EXC-2026-0519",
      },
    ],
    deviations: [
      {
        id: "dev-01",
        code: "DEV-2026-0042",
        title: "Slight Granule Moisture Variance",
        description: "Moisture content measured at 2.4% (specification limit: 1.5% - 2.2%). Extended fluid bed drying by 8 minutes.",
        severity: "minor",
        status: "resolved",
        loggedAt: "2026-08-28T09:30:00Z",
        loggedBy: "Ahmad Pratama",
        correctiveAction: "Extended fluidized bed dryer cycle by 8 minutes. Re-test confirmed moisture at 1.9%.",
      },
    ],
    auditLogs: [
      {
        id: "aud-01",
        timestamp: "2026-08-28T06:45:00Z",
        actorName: "Siti Rahmawati",
        actorRole: "Production Supervisor",
        action: "Created Work Order & Assigned Batch Number BATCH-PCT-2608-01",
        details: "Work Order released from Master Batch Record MBR-PCT-V4.",
        signatureHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
      {
        id: "aud-02",
        timestamp: "2026-08-28T07:00:00Z",
        actorName: "Ahmad Pratama",
        actorRole: "Senior Production Pharmacist",
        action: "Status transitioned: draft → in_progress",
        details: "Line clearance verified and sanitization check passed.",
        signatureHash: "8f4811a2f6b8966e3efd092c4314c46f56e0f80bc2b62d08a542b0c39f0490b4",
      },
      {
        id: "aud-03",
        timestamp: "2026-08-28T09:30:00Z",
        actorName: "Ahmad Pratama",
        actorRole: "Senior Production Pharmacist",
        action: "Logged Deviation DEV-2026-0042",
        details: "Minor moisture elevation handled per standard SOP-GRN-012.",
        signatureHash: "bc385412b18987b1c31289cf082987ae34091bcfe01928374019283740192837",
      },
    ],
    createdAt: "2026-08-28T06:45:00Z",
    updatedAt: "2026-08-29T09:00:00Z",
  },
  {
    id: "wo-pharm-002",
    code: "WO-2026-0802",
    batchNumber: "BATCH-AMX-2608-02",
    productName: "Amoxicillin Trihydrate 500mg Capsule",
    productCode: "PRD-AMX-500",
    lineId: "LINE-2",
    lineName: "Line 2 - Capsule Encapsulation",
    machineId: "MCH-CAP-02",
    machineName: "Bosch GKF 1400 Encapsulator",
    targetQuantity: 50000,
    completedQuantity: 32000,
    scrapQuantity: 180,
    unit: "Capsules",
    status: "in_progress",
    batchStatus: "in_production",
    operatorId: "emp-02",
    operatorName: "Siti Rahmawati",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Siti",
    operatorRole: "Production Supervisor",
    startDate: "2026-08-28T08:00:00Z",
    estimatedEndDate: "2026-08-29T16:00:00Z",
    materials: [
      {
        id: "mat-04",
        materialCode: "API-AMX-01",
        materialName: "Amoxicillin Trihydrate Compacted",
        requiredQty: 29.5,
        consumedQty: 19.0,
        unit: "kg",
        lotNumber: "LOT-AMX-2026-0801",
      },
      {
        id: "mat-05",
        materialCode: "EXC-CAP-00",
        materialName: "Empty Hard Gelatin Capsule Shell Size 0",
        requiredQty: 51000,
        consumedQty: 32500,
        unit: "Pcs",
        lotNumber: "LOT-GEL-2026-0610",
      },
    ],
    deviations: [],
    auditLogs: [
      {
        id: "aud-04",
        timestamp: "2026-08-28T07:45:00Z",
        actorName: "Siti Rahmawati",
        actorRole: "Production Supervisor",
        action: "Created Work Order & Assigned Batch Number BATCH-AMX-2608-02",
        details: "Dispensing verification confirmed by QA witness.",
        signatureHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
      },
    ],
    createdAt: "2026-08-28T07:45:00Z",
    updatedAt: "2026-08-29T08:30:00Z",
  },
  {
    id: "wo-pharm-003",
    code: "WO-2026-0803",
    batchNumber: "BATCH-IBU-2608-03",
    productName: "Ibuprofen 400mg Softgel Capsule",
    productCode: "PRD-IBU-400",
    lineId: "LINE-2",
    lineName: "Line 2 - Capsule Encapsulation",
    machineId: "MCH-SFT-01",
    machineName: "Changsung Softgel Machine",
    targetQuantity: 40000,
    completedQuantity: 12400,
    scrapQuantity: 840,
    unit: "Capsules",
    status: "paused",
    batchStatus: "quarantine",
    operatorId: "emp-03",
    operatorName: "Budi Santoso",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Budi",
    operatorRole: "Machine Operator Lead",
    startDate: "2026-08-28T09:00:00Z",
    estimatedEndDate: "2026-08-30T12:00:00Z",
    notes: "Paused due to ribbon seam thickness inspection under QA review.",
    materials: [
      {
        id: "mat-06",
        materialCode: "API-IBU-02",
        materialName: "Ibuprofen BP/USP Grade",
        requiredQty: 16.0,
        consumedQty: 5.2,
        unit: "kg",
        lotNumber: "LOT-IBU-2026-0711",
      },
    ],
    deviations: [
      {
        id: "dev-02",
        code: "DEV-2026-0043",
        title: "Gelatin Ribbon Thickness Seam Drift",
        description: "Left ribbon thickness measured at 0.72mm (limit 0.80mm ± 0.05mm). Minor seam leaking detected in 4 samples.",
        severity: "major",
        status: "under_investigation",
        loggedAt: "2026-08-28T14:15:00Z",
        loggedBy: "Budi Santoso",
        correctiveAction: "Halted encapsulation tooling. Adjusted wedge temperature and spreader box gap. In-process inspection ongoing.",
      },
    ],
    auditLogs: [
      {
        id: "aud-05",
        timestamp: "2026-08-28T14:20:00Z",
        actorName: "Budi Santoso",
        actorRole: "Machine Operator Lead",
        action: "Status transitioned: in_progress → paused",
        details: "Interrupted execution due to Major Deviation DEV-2026-0043.",
        signatureHash: "9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
      },
    ],
    createdAt: "2026-08-28T08:30:00Z",
    updatedAt: "2026-08-29T10:15:00Z",
  },
  {
    id: "wo-pharm-004",
    code: "WO-2026-0804",
    batchNumber: "BATCH-CTZ-2608-04",
    productName: "Cetirizine HCl 10mg Tablet",
    productCode: "PRD-CTZ-010",
    lineId: "LINE-1",
    lineName: "Line 1 - Granulation & Tableting",
    machineId: "MCH-TAB-01",
    machineName: "Fette 2090i Rotary Tablet Press",
    targetQuantity: 80000,
    completedQuantity: 80000,
    scrapQuantity: 110,
    unit: "Tablets",
    status: "completed",
    batchStatus: "quality_control",
    operatorId: "emp-04",
    operatorName: "Dewi Lestari",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    operatorRole: "Quality Assurance Officer",
    startDate: "2026-08-27T07:30:00Z",
    endDate: "2026-08-28T16:00:00Z",
    materials: [
      {
        id: "mat-07",
        materialCode: "API-CTZ-01",
        materialName: "Cetirizine Dihydrochloride API",
        requiredQty: 0.85,
        consumedQty: 0.85,
        unit: "kg",
        lotNumber: "LOT-CTZ-2026-0418",
      },
    ],
    deviations: [],
    auditLogs: [
      {
        id: "aud-06",
        timestamp: "2026-08-28T16:00:00Z",
        actorName: "Dewi Lestari",
        actorRole: "Quality Assurance Officer",
        action: "Status transitioned: in_progress → completed",
        details: "Yield reconcilation passed at 99.86%. Submitted batch samples for final QC dissolution testing.",
        signatureHash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
    ],
    createdAt: "2026-08-27T07:00:00Z",
    updatedAt: "2026-08-28T16:10:00Z",
  },
  {
    id: "wo-pharm-005",
    code: "WO-2026-0805",
    batchNumber: "BATCH-OMP-2608-05",
    productName: "Omeprazole 20mg Delayed-Release Capsule",
    productCode: "PRD-OMP-020",
    lineId: "LINE-2",
    lineName: "Line 2 - Capsule Encapsulation",
    machineId: "MCH-CAP-02",
    machineName: "Bosch GKF 1400 Encapsulator",
    targetQuantity: 60000,
    completedQuantity: 60000,
    scrapQuantity: 95,
    unit: "Capsules",
    status: "completed",
    batchStatus: "released",
    operatorId: "emp-05",
    operatorName: "Hendra Wijaya",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Hendra",
    operatorRole: "Process Chemist",
    startDate: "2026-08-26T08:00:00Z",
    endDate: "2026-08-27T17:30:00Z",
    materials: [
      {
        id: "mat-08",
        materialCode: "PEL-OMP-85",
        materialName: "Omeprazole 8.5% Enteric Coated Pellets",
        requiredQty: 14.5,
        consumedQty: 14.5,
        unit: "kg",
        lotNumber: "LOT-PEL-2026-0612",
      },
    ],
    deviations: [],
    auditLogs: [
      {
        id: "aud-07",
        timestamp: "2026-08-28T11:00:00Z",
        actorName: "Dewi Lestari",
        actorRole: "Quality Assurance Officer",
        action: "Batch Released by Qualified Person (QP)",
        details: "Certificate of Analysis CoA-2026-0891 approved for commercial distribution.",
        signatureHash: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      },
    ],
    createdAt: "2026-08-26T07:30:00Z",
    updatedAt: "2026-08-28T11:05:00Z",
  },
  {
    id: "wo-pharm-006",
    code: "WO-2026-0806",
    batchNumber: "BATCH-DXM-2608-06",
    productName: "Dextromethorphan HBr 15mg/5mL Syrup",
    productCode: "PRD-DXM-015",
    lineId: "LINE-3",
    lineName: "Line 3 - Liquid Syrup Formulation",
    machineId: "MCH-LIQ-01",
    machineName: "Stainless Steel Formulation Vessel 2000L",
    targetQuantity: 10000,
    completedQuantity: 0,
    scrapQuantity: 0,
    unit: "Bottles",
    status: "draft",
    batchStatus: "quarantine",
    operatorId: "emp-01",
    operatorName: "Ahmad Pratama",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ahmad",
    operatorRole: "Senior Production Pharmacist",
    startDate: "2026-08-30T07:00:00Z",
    estimatedEndDate: "2026-08-31T15:00:00Z",
    notes: "Awaiting final raw material assay test from QC laboratory.",
    materials: [
      {
        id: "mat-09",
        materialCode: "API-DXM-01",
        materialName: "Dextromethorphan Hydrobromide Powder",
        requiredQty: 3.0,
        consumedQty: 0,
        unit: "kg",
        lotNumber: "LOT-DXM-2026-0820",
      },
    ],
    deviations: [],
    auditLogs: [
      {
        id: "aud-08",
        timestamp: "2026-08-29T08:00:00Z",
        actorName: "Siti Rahmawati",
        actorRole: "Production Supervisor",
        action: "Created Work Order Draft",
        details: "Assigned Batch Number BATCH-DXM-2608-06.",
        signatureHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
    ],
    createdAt: "2026-08-29T08:00:00Z",
    updatedAt: "2026-08-29T08:00:00Z",
  },
  {
    id: "wo-pharm-007",
    code: "WO-2026-0807",
    batchNumber: "BATCH-MET-2608-07",
    productName: "Metformin HCl 500mg Extended-Release",
    productCode: "PRD-MET-500",
    lineId: "LINE-1",
    lineName: "Line 1 - Granulation & Tableting",
    machineId: "MCH-TAB-01",
    machineName: "Fette 2090i Rotary Tablet Press",
    targetQuantity: 75000,
    completedQuantity: 41200,
    scrapQuantity: 210,
    unit: "Tablets",
    status: "in_progress",
    batchStatus: "in_production",
    operatorId: "emp-05",
    operatorName: "Hendra Wijaya",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Hendra",
    operatorRole: "Process Chemist",
    startDate: "2026-08-28T10:00:00Z",
    estimatedEndDate: "2026-08-30T14:00:00Z",
    materials: [
      {
        id: "mat-10",
        materialCode: "API-MET-01",
        materialName: "Metformin Hydrochloride API",
        requiredQty: 37.5,
        consumedQty: 20.6,
        unit: "kg",
        lotNumber: "LOT-MET-2026-0805",
      },
    ],
    deviations: [],
    auditLogs: [],
    createdAt: "2026-08-28T09:30:00Z",
    updatedAt: "2026-08-29T09:00:00Z",
  },
  {
    id: "wo-pharm-008",
    code: "WO-2026-0808",
    batchNumber: "BATCH-AZI-2608-08",
    productName: "Azithromycin 250mg Film-Coated Tablet",
    productCode: "PRD-AZI-250",
    lineId: "LINE-4",
    lineName: "Line 4 - Blister Packaging & Secondary Boxing",
    machineId: "MCH-BLS-01",
    machineName: "Uhlmann UPS 4 Blister Packaging Machine",
    targetQuantity: 30000,
    completedQuantity: 0,
    scrapQuantity: 0,
    unit: "Blisters",
    status: "draft",
    batchStatus: "quarantine",
    operatorId: "emp-03",
    operatorName: "Budi Santoso",
    operatorAvatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=Budi",
    operatorRole: "Machine Operator Lead",
    startDate: "2026-08-31T07:00:00Z",
    materials: [],
    deviations: [],
    auditLogs: [],
    createdAt: "2026-08-29T09:15:00Z",
    updatedAt: "2026-08-29T09:15:00Z",
  },
];

let workOrdersDatabase: WorkOrder[] = [...INITIAL_MOCK_WORK_ORDERS];

export const workOrderService = {
  async getWorkOrders(params?: WorkOrderFilterParams): Promise<WorkOrderListResponse> {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 80));

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 10;
    const search = params?.search?.toLowerCase().trim() ?? "";
    const status = params?.status ?? "all";
    const lineId = params?.line_id ?? "all";

    let filtered = [...workOrdersDatabase];

    if (search) {
      filtered = filtered.filter(
        (wo) =>
          wo.code.toLowerCase().includes(search) ||
          wo.batchNumber.toLowerCase().includes(search) ||
          wo.productName.toLowerCase().includes(search) ||
          wo.operatorName.toLowerCase().includes(search),
      );
    }

    if (status !== "all") {
      filtered = filtered.filter((wo) => wo.status === status);
    }

    if (lineId !== "all" && lineId) {
      filtered = filtered.filter((wo) => wo.lineId === lineId);
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

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = workOrdersDatabase.find((wo) => wo.id === id);
    if (!found) {
      throw new Error(`Work Order with ID "${id}" not found.`);
    }
    return found;
  },

  async createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const nextIndex = workOrdersDatabase.length + 1;
    const newCode = input.code || `WO-2026-${String(nextIndex).padStart(4, "0")}`;

    const newOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      code: newCode,
      batchNumber: input.batchNumber,
      productName: input.productName,
      productCode: input.productCode,
      lineId: input.lineId,
      lineName: input.lineName,
      machineId: input.machineId,
      machineName: input.machineName,
      targetQuantity: input.targetQuantity,
      completedQuantity: 0,
      scrapQuantity: 0,
      unit: input.unit || "Units",
      status: "draft",
      batchStatus: "quarantine",
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      operatorAvatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(input.operatorName)}`,
      operatorRole: input.operatorRole,
      startDate: input.startDate,
      estimatedEndDate: input.estimatedEndDate,
      materials: [],
      deviations: [],
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: input.operatorName,
          actorRole: input.operatorRole,
          action: "Created Work Order & Assigned Batch Number",
          details: `Target: ${input.targetQuantity} ${input.unit}. Line: ${input.lineName}.`,
          signatureHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
        },
      ],
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    workOrdersDatabase = [newOrder, ...workOrdersDatabase];
    return newOrder;
  },

  async updateWorkOrderStatus(input: UpdateWorkOrderStatusInput): Promise<WorkOrder> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = workOrdersDatabase.findIndex((wo) => wo.id === input.id);
    if (index === -1) {
      throw new Error("Work Order not found.");
    }

    const current = workOrdersDatabase[index];
    const prevStatus = current.status;
    const now = new Date().toISOString();

    let updatedBatchStatus = current.batchStatus;
    if (input.status === "in_progress") updatedBatchStatus = "in_production";
    if (input.status === "completed") updatedBatchStatus = "quality_control";
    if (input.status === "cancelled") updatedBatchStatus = "rejected";

    const auditAction = `Status transitioned: ${prevStatus} → ${input.status}`;
    const newAuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: now,
      actorName: input.actorName || "System Operator",
      actorRole: "Responsible Pharmacist",
      action: auditAction,
      details: input.reason || input.notes || `Work Order status changed to ${input.status}`,
      signatureHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    };

    const updated: WorkOrder = {
      ...current,
      status: input.status,
      batchStatus: updatedBatchStatus,
      endDate: input.status === "completed" ? now : current.endDate,
      auditLogs: [newAuditLog, ...current.auditLogs],
      updatedAt: now,
    };

    workOrdersDatabase[index] = updated;
    return updated;
  },

  async logDeviation(input: CreateDeviationInput): Promise<WorkOrder> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = workOrdersDatabase.findIndex((wo) => wo.id === input.workOrderId);
    if (index === -1) {
      throw new Error("Work Order not found.");
    }

    const current = workOrdersDatabase[index];
    const now = new Date().toISOString();
    const devCode = `DEV-2026-${String(current.deviations.length + 40).padStart(4, "0")}`;

    const newDev = {
      id: `dev-${Date.now()}`,
      code: devCode,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: "open" as const,
      loggedAt: now,
      loggedBy: input.loggedBy,
      correctiveAction: input.correctiveAction,
    };

    const newAuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: now,
      actorName: input.loggedBy,
      actorRole: "Production Operator",
      action: `Logged Deviation ${devCode} (${input.severity.toUpperCase()})`,
      details: input.title,
      signatureHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    };

    const updated: WorkOrder = {
      ...current,
      deviations: [newDev, ...current.deviations],
      auditLogs: [newAuditLog, ...current.auditLogs],
      updatedAt: now,
    };

    workOrdersDatabase[index] = updated;
    return updated;
  },
};
