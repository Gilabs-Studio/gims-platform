import { z } from "zod";

// Overtime type enum
export const overtimeTypeSchema = z.enum(["AUTO_DETECTED", "MANUAL_CLAIM", "PRE_APPROVED"]);

// Overtime status enum
export const overtimeStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELED"]);

// Create overtime request schema
export const createOvertimeSchema = z.object({
  date: z.string()
    .min(1, "Date is required"),
  start_time: z.string()
    .min(1, "Start time is required")
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  end_time: z.string()
    .min(1, "End time is required")
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  reason: z.string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters"),
  type: overtimeTypeSchema.default("MANUAL_CLAIM"),
});

export type CreateOvertimeFormData = z.infer<typeof createOvertimeSchema>;

// Update overtime request schema
export const updateOvertimeSchema = z.object({
  start_time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
    .optional(),
  end_time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
    .optional(),
  reason: z.string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters")
    .optional(),
});

export type UpdateOvertimeFormData = z.infer<typeof updateOvertimeSchema>;

// Approve overtime schema
export const approveOvertimeSchema = z.object({
  approved_minutes: z.number()
    .min(1, "Approved minutes must be at least 1")
    .max(720, "Approved minutes cannot exceed 12 hours")
    .optional(),
});

export type ApproveOvertimeFormData = z.infer<typeof approveOvertimeSchema>;

// Reject overtime schema
export const rejectOvertimeSchema = z.object({
  rejection_reason: z.string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters"),
});

export type RejectOvertimeFormData = z.infer<typeof rejectOvertimeSchema>;

// Overtime type options for UI
export const OVERTIME_TYPE_OPTIONS = [
  { value: "AUTO_DETECTED", label: "Auto-detected" },
  { value: "MANUAL_CLAIM", label: "Manual Claim" },
  { value: "PRE_APPROVED", label: "Pre-approved" },
] as const;

// Overtime status options for UI
export const OVERTIME_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending", color: "warning" },
  { value: "APPROVED", label: "Approved", color: "success" },
  { value: "REJECTED", label: "Rejected", color: "destructive" },
  { value: "CANCELED", label: "Canceled", color: "secondary" },
] as const;
