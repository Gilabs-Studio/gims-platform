import { z } from "zod";

export const createClosingSchema = z.object({
  period_end_date: z.string().trim().min(1),
  notes: z.string().optional(),
});

export type CreateClosingValues = z.infer<typeof createClosingSchema>;
