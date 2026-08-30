import type {
  AuditTrailDashboardData,
  AuditTrailFilterParams,
  AuditTrailRecord,
} from "../types/csv-audit-trail.types";

const MOCK_AUDIT_TRAIL_RECORDS: AuditTrailRecord[] = [
  {
    id: "rec-01",
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
    id: "rec-02",
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
    id: "rec-03",
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
    id: "rec-04",
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
    id: "rec-05",
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
  {
    id: "rec-06",
    timestamp: "2026-05-16T09:55:43Z",
    formattedDate: "16 May 2026",
    formattedTime: "09:55:43",
    user: {
      name: "System",
      role: "(Automated)",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=GimsSystem",
      isSystem: true,
    },
    module: "user_access",
    moduleLabel: "User Access",
    dataType: "Login",
    recordId: "USR-LOGIN-20260516-045",
    action: "login",
    beforeChange: "-",
    beforeChangeHighlight: "normal",
    afterChange: "Login Success",
    afterChangeHighlight: "normal",
    reason: "User authentication",
    source: "web_app",
    ipAddress: "192.168.1.100",
    signatureDigest: "sha256:2c624232cdd221771294dfbb310aca000a0df6ec9b5fe98b724056f0d04e022b",
  },
  {
    id: "rec-07",
    timestamp: "2026-05-16T09:52:10Z",
    formattedDate: "16 May 2026",
    formattedTime: "09:52:10",
    user: {
      name: "Dimas Anggara",
      role: "Technician",
      avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dimas",
    },
    module: "machine_telemetry",
    moduleLabel: "Machine Telemetry",
    dataType: "Parameter",
    recordId: "CNC-V01-TMP",
    action: "update",
    beforeChange: "72.1 °C",
    beforeChangeHighlight: "normal",
    afterChange: "76.5 °C",
    afterChangeHighlight: "danger",
    reason: "Normal fluctuation",
    source: "edge_gateway",
    ipAddress: "192.168.100.12",
    signatureDigest: "sha256:119352c636cb10d10452615a7a0eee709f3e1f4c495f54019f7b30e280640fa3",
  },
];

const MOCK_AUDIT_TRAIL_DATA: AuditTrailDashboardData = {
  kpis: {
    totalAuditLogs: 2458,
    totalAuditLogsSubtitle: "All time",
    users: 68,
    usersSubtitle: "Active users",
    modules: 12,
    modulesSubtitle: "Across all systems",
    criticalDataChanges: 326,
    criticalDataChangesSubtitle: "Require attention",
    dataIntegrityPercentage: 100,
    dataIntegritySubtitle: "Tamper-proof",
  },
  records: MOCK_AUDIT_TRAIL_RECORDS,
  totalLogs: 2458,
};

export const csvAuditTrailService = {
  async getDashboardData(params?: AuditTrailFilterParams): Promise<AuditTrailDashboardData> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let filtered = [...MOCK_AUDIT_TRAIL_DATA.records];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.recordId.toLowerCase().includes(q) ||
          r.user.name.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.dataType.toLowerCase().includes(q),
      );
    }
    if (params?.module && params.module !== "all") {
      filtered = filtered.filter((r) => r.module === params.module);
    }
    if (params?.action && params.action !== "all") {
      filtered = filtered.filter((r) => r.action === params.action);
    }

    return {
      ...MOCK_AUDIT_TRAIL_DATA,
      records: filtered,
      totalLogs: MOCK_AUDIT_TRAIL_DATA.totalLogs,
    };
  },
};
