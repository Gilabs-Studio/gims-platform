import { z } from "zod";

export const assetCategoryTypeSchema = z.enum(["FIXED", "CURRENT", "INTANGIBLE", "OTHER"]);

export const depreciationMethodSchema = z.enum(["SL", "DB", "NONE"]);

export const assetCategoryFormSchema = z.object({
  name: z.string().trim().min(1),
  type: assetCategoryTypeSchema,
  is_depreciable: z.boolean(),
  depreciation_method: depreciationMethodSchema,
  useful_life_months: z.number().int().nonnegative(),
  depreciation_rate: z.number().nonnegative().optional(),
  asset_account_id: z.string().uuid(),
  accumulated_depreciation_account_id: z.string().uuid().optional().or(z.literal("")),
  depreciation_expense_account_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

export type AssetCategoryFormValues = z.infer<typeof assetCategoryFormSchema>;
