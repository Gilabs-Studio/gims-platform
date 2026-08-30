import { z } from "zod";

export const validationFilterSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  docType: z.string().optional(),
});

export type ValidationFilterValues = z.infer<typeof validationFilterSchema>;
