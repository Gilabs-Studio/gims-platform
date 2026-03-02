import { z } from "zod";

/**
 * Schema for journal lines filter form.
 * Validates the filter parameters before sending to API.
 */
export const journalLinesFilterSchema = z.object({
  search: z.string().trim().optional(),
  chart_of_account_id: z.string().uuid().optional().or(z.literal("")),
  account_type: z.string().optional(),
  reference_type: z.string().optional(),
  journal_status: z.enum(["draft", "posted"]).optional().or(z.literal("")),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
});

export type JournalLinesFilterValues = z.infer<typeof journalLinesFilterSchema>;
