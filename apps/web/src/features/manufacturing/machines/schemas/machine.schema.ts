import { z } from "zod";

export const DOWNTIME_CATEGORIES = [
  "Unplanned Breakdown",
  "Tooling / Mold Change",
  "Material Shortage",
  "Quality Inspection",
  "Planned Maintenance",
  "Operator Absence",
] as const;

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const MACHINE_STATUSES = ["running", "idle", "downtime", "maintenance"] as const;

export const createIncidentSchema = z.object({
  machineId: z.string().min(1, { message: "Machine ID is required" }),
  reason: z
    .string()
    .min(3, { message: "Reason must be at least 3 characters" })
    .max(255, { message: "Reason cannot exceed 255 characters" }),
  category: z.enum(DOWNTIME_CATEGORIES),
  severity: z.enum(INCIDENT_SEVERITIES),
  durationMinutes: z
    .number()
    .min(1, { message: "Duration must be at least 1 minute" })
    .max(1440, { message: "Duration cannot exceed 24 hours (1440 minutes)" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  reportedBy: z
    .string()
    .min(2, { message: "Reporter name must be at least 2 characters" })
    .max(100, { message: "Reporter name cannot exceed 100 characters" }),
  actionTaken: z
    .string()
    .max(500, { message: "Action taken notes cannot exceed 500 characters" })
    .optional(),
});

export type CreateIncidentSchemaType = z.infer<typeof createIncidentSchema>;

export const updateMachineStatusSchema = z.object({
  machineId: z.string().min(1, { message: "Machine ID is required" }),
  status: z.enum(MACHINE_STATUSES),
  reason: z.string().max(255).optional(),
});

export type UpdateMachineStatusSchemaType = z.infer<typeof updateMachineStatusSchema>;
