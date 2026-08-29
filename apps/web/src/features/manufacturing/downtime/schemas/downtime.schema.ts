import { z } from "zod";

export const downtimeCategoryTypeEnum = z.enum(["unplanned", "planned"]);

export const downtimeCategoryEnum = z.enum([
  "Machine Breakdown",
  "Component Failure",
  "Tooling / Mold Change",
  "Changeover & Setup",
  "CIP & Cleaning Validation",
  "Material Shortage",
  "Quality Inspection Hold",
  "Scheduled Maintenance",
  "Operator Absence",
  "Utility Failure",
]);

export const incidentSeverityEnum = z.enum(["low", "medium", "high", "critical"]);

export const resolutionStatusEnum = z.enum(["open", "in_progress", "resolved"]);

export const createDowntimeSchema = z.object({
  machineId: z.string().min(1, "Machine is required"),
  lineId: z.string().min(1, "Production Line is required"),
  categoryType: downtimeCategoryTypeEnum,
  category: downtimeCategoryEnum,
  reason: z
    .string()
    .min(3, "Reason description must be at least 3 characters")
    .max(200, "Reason is too long"),
  rootCauseAnalysis: z.string().max(1000, "Root cause analysis is too long").optional(),
  actionTaken: z.string().max(1000, "Action taken is too long").optional(),
  severity: incidentSeverityEnum,
  status: resolutionStatusEnum,
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  durationMinutes: z
    .number()
    .min(1, "Duration must be at least 1 minute")
    .max(1440, "Duration cannot exceed 24 hours (1440 min)"),
  lostUnitsEstimated: z.number().min(0, "Units cannot be negative").optional(),
  reportedBy: z.string().min(2, "Reporter name is required"),
  assignedTechnician: z.string().optional(),
  capaRequired: z.boolean().optional(),
});

export type CreateDowntimeFormData = z.infer<typeof createDowntimeSchema>;

export const updateDowntimeSchema = createDowntimeSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateDowntimeFormData = z.infer<typeof updateDowntimeSchema>;
