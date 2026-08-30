import { z } from "zod";

export const auditTrailFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(10),
  module: z.string().optional(),
  action: z.string().optional(),
  criticality: z.string().optional(),
  actor: z.string().optional(),
  search: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  entity_id: z.string().optional(),
});

export type AuditTrailFilterValues = z.infer<typeof auditTrailFilterSchema>;
