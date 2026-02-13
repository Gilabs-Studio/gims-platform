import { z } from "zod";

export const depreciationMethodSchema = z.enum(["SL", "DB"]);

export const assetCategoryFormSchema = z.object({
  name: z.string().trim().min(1),
  depreciation_method: depreciationMethodSchema,
  useful_life_months: z.number().int().positive(),
  depreciation_rate: z.number().positive().optional(),
  asset_account_id: z.string().uuid(),
  accumulated_depreciation_account_id: z.string().uuid(),
  depreciation_expense_account_id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

export type AssetCategoryFormValues = z.infer<typeof assetCategoryFormSchema>;
