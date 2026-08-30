import type {
  AuditLogFilterParams,
  AuditTrailLogItem,
  SystemValidationDashboardData,
} from "../types/csv-validation.types";

const MOCK_VALIDATION_LOGS: AuditTrailLogItem[] = [
  {
    id: "log-01",
    timestamp: "2026-05-16T10:35:22Z",
    formattedDate: "16 May 2026",
    formattedTime: "10:35:22",
    user: {
      name: "Rian Hidayat",
      role: "Operator",
      avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Rian",
    },
    module: "work_order",
    moduleLabel: "Work Order",
    dataType: "Status",
    recordId: "WO-20260516-001",
    action: "update",
    beforeChange: "In Progress",
    beforeChangeHighlight: "normal",
    afterChange: "Completed",
    afterChangeHighlight: "success",
    reason: "Production finished",
    source: "web_app",
    ipAddress: "192.168.10.45",
    signatureDigest: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  },
  {
    id: "log-02",
    timestamp: "2026-05-16T10:31:05Z",
    formattedDate: "16 May 2026",
    formattedTime: "10:31:05",
    user: {
      name: "Aris Munandar",
      role: "Engineer",
      avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aris",
    },
    module: "quality_andon",
    moduleLabel: "Quality Andon",
    dataType: "Alarm Status",
    recordId: "AND-20260516-017",
    action: "update",
    beforeChange: "Active (Critical)",
    beforeChangeHighlight: "danger",
    afterChange: "Acknowledged",
    afterChangeHighlight: "warning",
    reason: "Issue acknowledged",
    source: "web_app",
    ipAddress: "192.168.10.51",
    signatureDigest: "sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  },
  {
    id: "log-03",
    timestamp: "2026-05-16T10:28:44Z",
    formattedDate: "16 May 2026",
    formattedTime: "10:28:44",
    user: {
      name: "Bambang Kurnia",
      role: "Supervisor",
      avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Bambang",
    },
    module: "work_order",
    moduleLabel: "Work Order",
    dataType: "Assigned To",
    recordId: "WO-20260516-002",
    action: "update",
    beforeChange: "Bambang Kurnia",
    beforeChangeHighlight: "normal",
    afterChange: "Dimas Anggara",
    afterChangeHighlight: "normal",
    reason: "Shift handover",
    source: "web_app",
    ipAddress: "192.168.20.12",
    signatureDigest: "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  },
  {
    id: "log-04",
    timestamp: "2026-05-16T10:21:11Z",
    formattedDate: "16 May 2026",
    formattedTime: "10:21:11",
    user: {
      name: "Dewi Lestari",
      role: "QA",
      avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dewi",
    },
    module: "quality_check",
    moduleLabel: "Quality Check",
    dataType: "Inspection Result",
    recordId: "QC-20260516-089",
    action: "update",
    beforeChange: "Pass",
    beforeChangeHighlight: "success",
    afterChange: "Fail",
    afterChangeHighlight: "danger",
    reason: "Spec out of range",
    source: "web_app",
    ipAddress: "192.168.20.88",
    signatureDigest: "sha256:b10a8db164e0754105b7a99be72e3fe5ff0f81d11ca739c36ec3b90fbb694723",
  },
  {
    id: "log-05",
    timestamp: "2026-05-16T10:18:07Z",
    formattedDate: "16 May 2026",
    formattedTime: "10:18:07",
    user: {
      name: "Suryadi",
      role: "Maintenance",
      avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Suryadi",
    },
    module: "maintenance",
    moduleLabel: "Maintenance",
    dataType: "Work Request Status",
    recordId: "MNT-20260516-031",
    action: "update",
    beforeChange: "Open",
    beforeChangeHighlight: "normal",
    afterChange: "In Progress",
    afterChangeHighlight: "normal",
    reason: "Work started",
    source: "mobile_app",
    ipAddress: "10.0.4.19",
    signatureDigest: "sha256:fb8e20fc2e4c3f248c60c39bd652f3c1347298ab4231b28d085966614ec04323",
  },
];

const MOCK_VALIDATION_DATA: SystemValidationDashboardData = {
  kpis: {
    status: "qualified",
    statusLabel: "Qualified",
    lastQualified: "16 May 2026",
    nextReview: "16 May 2027",
    lifecyclePhase: "Operational",
    lifecycleSince: "Since 01 Apr 2026",
    complianceStatus: "compliant",
    regulation: "BPOM GMP",
    complianceRate: 100,
    openCapa: 12,
    closedThisYear: 18,
    overdueCapa: 2,
  },
  logs: MOCK_VALIDATION_LOGS,
  totalLogs: 245,
};

export const csvValidationService = {
  async getDashboardData(params?: AuditLogFilterParams): Promise<SystemValidationDashboardData> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let filtered = [...MOCK_VALIDATION_DATA.logs];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.recordId.toLowerCase().includes(q) ||
          l.user.name.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.dataType.toLowerCase().includes(q),
      );
    }
    if (params?.module && params.module !== "all") {
      filtered = filtered.filter((l) => l.module === params.module);
    }
    if (params?.action && params.action !== "all") {
      filtered = filtered.filter((l) => l.action === params.action);
    }

    return {
      ...MOCK_VALIDATION_DATA,
      logs: filtered,
      totalLogs: MOCK_VALIDATION_DATA.totalLogs,
    };
  },
};
