import { z } from "zod";

export const andonStatusEnum = z.enum(["normal", "warning", "critical_alarm"]);
export const incidentSeverityEnum = z.enum(["minor", "major", "critical"]);
export const urgencyEnum = z.enum(["high", "critical"]);

export const acknowledgeAlarmSchema = z.object({
  parameterId: z.string().min(1, "Parameter ID is required"),
  actorName: z.string().min(1, "Operator / Reviewer name is required"),
  notes: z.string().optional(),
});

export const escalateToQASchema = z.object({
  parameterId: z.string().min(1, "Parameter ID is required"),
  urgency: urgencyEnum,
  message: z.string().min(5, "Escalation message must be at least 5 characters"),
  reportedBy: z.string().min(1, "Reporter name is required"),
  targetQAPerson: z.string().optional(),
});

export const logQualityIncidentSchema = z.object({
  parameterId: z.string().min(1, "Parameter ID is required"),
  title: z.string().min(3, "Incident title must be at least 3 characters"),
  description: z.string().min(5, "Incident description must be at least 5 characters"),
  severity: incidentSeverityEnum,
  loggedBy: z.string().min(1, "Reporter name is required"),
  correctiveAction: z.string().optional(),
  isCapaRequired: z.boolean().optional(),
});

export type AcknowledgeAlarmSchema = z.infer<typeof acknowledgeAlarmSchema>;
export type EscalateToQASchema = z.infer<typeof escalateToQASchema>;
export type LogQualityIncidentSchema = z.infer<typeof logQualityIncidentSchema>;

