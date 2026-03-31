import { z } from "zod";

export const assetFormSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category_id: z.string().uuid(),
  location_id: z.string().uuid(),
  acquisition_date: z.string().trim().min(1),
  acquisition_cost: z.number().positive(),
  salvage_value: z.number().nonnegative().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const depreciateAssetSchema = z.object({
  as_of_date: z.string().trim().min(1),
});

export type DepreciateAssetValues = z.infer<typeof depreciateAssetSchema>;

export const transferAssetSchema = z.object({
  location_id: z.string().uuid(),
  transfer_date: z.string().trim().min(1),
  description: z.string().optional(),
});

export type TransferAssetValues = z.infer<typeof transferAssetSchema>;

export const disposeAssetSchema = z.object({
  disposal_date: z.string().trim().min(1),
  description: z.string().optional(),
});

export type DisposeAssetValues = z.infer<typeof disposeAssetSchema>;

export const revalueAssetSchema = z.object({
  new_cost: z.number().positive(),
  transaction_date: z.string().trim().min(1),
  description: z.string().optional(),
});

export type RevalueAssetValues = z.infer<typeof revalueAssetSchema>;

export const adjustAssetSchema = z.object({
  amount: z.number(),
  transaction_date: z.string().trim().min(1),
  description: z.string().optional(),
});

export type AdjustAssetValues = z.infer<typeof adjustAssetSchema>;

export const sellAssetSchema = z.object({
  disposal_date: z.string().trim().min(1),
  sale_amount: z.number().positive(),
  description: z.string().optional(),
});

export type SellAssetValues = z.infer<typeof sellAssetSchema>;

export const assignAssetSchema = z.object({
  employee_id: z.string().uuid(),
  notes: z.string().optional(),
});

export type AssignAssetValues = z.infer<typeof assignAssetSchema>;

export const returnAssetSchema = z.object({
  return_date: z.string().trim().min(1),
  return_reason: z.string().optional(),
  notes: z.string().optional(),
});

export type ReturnAssetValues = z.infer<typeof returnAssetSchema>;
