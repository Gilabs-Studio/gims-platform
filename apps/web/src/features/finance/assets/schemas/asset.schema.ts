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
