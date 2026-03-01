import { z } from "zod";

export const coaTypeSchema = z.enum([
  "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE",
  "CASH_BANK", "CURRENT_ASSET", "FIXED_ASSET",
  "TRADE_PAYABLE", "COST_OF_GOODS_SOLD", "SALARY_WAGES", "OPERATIONAL"
]);

export const coaFormSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: coaTypeSchema,
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type CoaFormValues = z.infer<typeof coaFormSchema>;
