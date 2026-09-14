import { z } from "zod";

export const createBorrowingSchema = z.object({
  asset_id: z.string().min(1, { message: "Asset is required" }),
  borrow_date: z.string().min(1, { message: "Borrow date is required" }),
  expected_return_date: z
    .string()
    .min(1, { message: "Expected return date is required" }),
  purpose: z
    .string()
    .min(5, { message: "Purpose must be at least 5 characters" }),
  initial_condition_notes: z.string().optional(),
});

export type CreateBorrowingFormValues = z.infer<typeof createBorrowingSchema>;

export const approvalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
});

export type ApprovalFormValues = z.infer<typeof approvalSchema>;

export const returnAssetSchema = z.object({
  return_condition: z.enum([
    "excellent",
    "good",
    "fair",
    "damaged",
    "under_repair",
  ]),
  return_notes: z.string().optional(),
});

export type ReturnAssetFormValues = z.infer<typeof returnAssetSchema>;

export const damageReportSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters" }),
});

export type DamageReportFormValues = z.infer<typeof damageReportSchema>;

export const maintenanceSchema = z.object({
  service_type: z.enum([
    "routine_service",
    "repair",
    "calibration",
    "inspection",
  ]),
  maintenance_date: z
    .string()
    .min(1, { message: "Maintenance date is required" }),
  cost: z.number().min(0, { message: "Cost must be a positive number" }),
  vendor_name: z.string().min(2, { message: "Vendor name is required" }),
  notes: z.string().min(5, { message: "Notes must be at least 5 characters" }),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
