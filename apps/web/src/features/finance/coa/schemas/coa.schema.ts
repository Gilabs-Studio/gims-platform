import { z } from "zod";

export const coaTypeSchema = z.enum([
  "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE",
  "CASH_BANK", "CURRENT_ASSET", "FIXED_ASSET",
  "TRADE_PAYABLE", "COST_OF_GOODS_SOLD", "SALARY_WAGES", "OPERATIONAL"
]);

export const coaFormSchema = z.object({
  code: z.string().trim().max(50, "Code must not exceed 50 characters"),
  name: z.string().trim().min(1, "Name is required").max(200, "Name must not exceed 200 characters"),
  type: coaTypeSchema,
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  is_postable: z.boolean().optional(),
}).superRefine((value, ctx) => {
  const hasParent = (value.parent_id ?? null) !== null;
  if (!hasParent && value.code.trim() === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["code"],
      message: "Code is required",
    });
  }
});

export type CoaFormValues = z.infer<typeof coaFormSchema>;
