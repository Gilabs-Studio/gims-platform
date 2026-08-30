export interface SignOffPerson {
  name: string;
  role: string;
  department: string;
  date?: string;
  signatureHash?: string;
}

export interface SystemValidationKPIs {
  status: "qualified" | "in_validation" | "revalidation_due";
  statusLabel: string;
  lastQualified: string;
  nextReview: string;
  lifecyclePhase: "Design" | "DQ" | "IQ" | "OQ" | "PQ" | "Operational";
  lifecycleSince: string;
  complianceStatus: "compliant" | "partial" | "non_compliant";
  regulation: string;
  complianceRate: number;
  openCapa: number;
  closedThisYear: number;
  overdueCapa: number;
}

export interface AuditTrailLogItem {
  id: string;
  timestamp: string; // ISO
  formattedDate: string;
  formattedTime: string;
  user: {
    name: string;
    role: string;
    avatarUrl?: string;
    isSystem?: boolean;
  };
  module: "work_order" | "quality_andon" | "quality_check" | "maintenance" | "user_access" | "machine_telemetry";
  moduleLabel: string;
  dataType: string;
  recordId: string;
  action: "update" | "login" | "create" | "delete" | "sign";
  beforeChange: string;
  beforeChangeHighlight?: "normal" | "danger" | "success" | "warning";
  afterChange: string;
  afterChangeHighlight?: "normal" | "danger" | "success" | "warning";
  reason: string;
  source: "web_app" | "mobile_app" | "edge_gateway";
  ipAddress?: string;
  signatureDigest?: string;
}

export interface SystemValidationDashboardData {
  kpis: SystemValidationKPIs;
  logs: AuditTrailLogItem[];
  totalLogs: number;
}

export interface AuditLogFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  module?: string;
  dataType?: string;
  action?: string;
  user?: string;
  dateRange?: string;
}
