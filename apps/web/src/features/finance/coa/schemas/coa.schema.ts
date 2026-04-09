import { z } from "zod";

export const coaTypeSchema = z.enum([
  "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE",
  "CASH_BANK", "CURRENT_ASSET", "FIXED_ASSET",
  "TRADE_PAYABLE", "COST_OF_GOODS_SOLD", "SALARY_WAGES", "OPERATIONAL"
]);

export const coaFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(50, "Code must not exceed 50 characters"),
  name: z.string().trim().min(1, "Name is required").max(200, "Name must not exceed 200 characters"),
  type: coaTypeSchema,
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  opening_balance: z.coerce.number().finite().default(0),
  opening_date: z.string().trim().nullable().optional(),
}).superRefine((values, ctx) => {
  const hasOpeningBalance = Math.abs(values.opening_balance ?? 0) > 0;
  const hasOpeningDate = (values.opening_date ?? "").trim().length > 0;

  if (hasOpeningBalance && !hasOpeningDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["opening_date"],
      message: "Opening date is required when opening balance is non-zero",
    });
  }
});

export type CoaFormValues = z.infer<typeof coaFormSchema>;
