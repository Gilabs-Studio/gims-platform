export type WorkOrderStatus =
  | "draft"
  | "submitted"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export type BatchStatus =
  | "quarantine"
  | "in_production"
  | "quality_control"
  | "released"
  | "rejected";

export type DeviationSeverity = "minor" | "major" | "critical";

export type DeviationStatus = "open" | "under_investigation" | "resolved" | "closed";

export interface WorkOrderMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  consumedQty: number;
  unit: string;
  lotNumber: string;
}

export interface WorkOrderDeviation {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: DeviationSeverity;
  status: DeviationStatus;
  loggedAt: string;
  loggedBy: string;
  correctiveAction?: string;
}

export interface WorkOrderAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  details?: string;
  signatureHash?: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  batchNumber: string;
  productName: string;
  productCode: string;
  lineId: string;
  lineName: string;
  machineId?: string;
  machineName?: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  unit: string;
  status: WorkOrderStatus;
  batchStatus: BatchStatus;
  operatorId: string;
  operatorName: string;
  operatorAvatar?: string;
  operatorRole: string;
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
  materials: WorkOrderMaterial[];
  deviations: WorkOrderDeviation[];
  auditLogs: WorkOrderAuditLog[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: WorkOrderStatus | "all";
  line_id?: string;
  batch_status?: BatchStatus | "all";
}

export interface WorkOrderPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface WorkOrderListResponse {
  data: WorkOrder[];
  meta: {
    pagination: WorkOrderPaginationMeta;
  };
}

export interface CreateWorkOrderInput {
  code?: string;
  batchNumber: string;
  productName: string;
  productCode: string;
  lineId: string;
  lineName: string;
  machineId?: string;
  machineName?: string;
  targetQuantity: number;
  unit: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  startDate?: string;
  estimatedEndDate?: string;
  notes?: string;
}

export interface UpdateWorkOrderStatusInput {
  id: string;
  status: WorkOrderStatus;
  reason?: string;
  notes?: string;
  actorName?: string;
}

export interface CreateDeviationInput {
  workOrderId: string;
  title: string;
  description: string;
  severity: DeviationSeverity;
  loggedBy: string;
  correctiveAction?: string;
}
