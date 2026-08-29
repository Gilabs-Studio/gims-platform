import { z } from "zod";

export const workOrderStatusEnum = z.enum([
  "draft",
  "submitted",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
]);

export const batchStatusEnum = z.enum([
  "quarantine",
  "in_production",
  "quality_control",
  "released",
  "rejected",
]);

export const deviationSeverityEnum = z.enum(["minor", "major", "critical"]);

export const createWorkOrderSchema = z.object({
  batchNumber: z.string().min(1, "Batch number is required"),
  productName: z.string().min(1, "Product name is required"),
  productCode: z.string().min(1, "Product code / SKU is required"),
  lineId: z.string().min(1, "Production line is required"),
  lineName: z.string().min(1, "Line name is required"),
  machineId: z.string().optional(),
  machineName: z.string().optional(),
  targetQuantity: z.number().min(1, "Target quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  operatorId: z.string().min(1, "Operator is required"),
  operatorName: z.string().min(1, "Operator name is required"),
  operatorRole: z.string().min(1, "Operator role is required"),
  startDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateWorkOrderStatusSchema = z.object({
  id: z.string().min(1),
  status: workOrderStatusEnum,
  reason: z.string().optional(),
  notes: z.string().optional(),
  actorName: z.string().optional(),
});

export const createDeviationSchema = z.object({
  workOrderId: z.string().min(1, "Work Order is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  severity: deviationSeverityEnum,
  loggedBy: z.string().min(1, "Reporter name is required"),
  correctiveAction: z.string().optional(),
});

export type CreateWorkOrderSchema = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderStatusSchema = z.infer<typeof updateWorkOrderStatusSchema>;
export type CreateDeviationSchema = z.infer<typeof createDeviationSchema>;
