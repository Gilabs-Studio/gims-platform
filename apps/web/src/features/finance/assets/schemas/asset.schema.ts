import { z } from "zod";

export const assetFormSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  asset_type_id: z.enum(["FIXED", "CURRENT", "INTANGIBLE", "OTHER"]),
  asset_category_id: z.string().trim().min(1),
  location_id: z.string().trim().min(1),
  acquisition_date: z.string().trim().min(1),
  acquisition_cost: z.number().positive(),
  salvage_value: z.number().nonnegative().optional(),
  useful_life_months: z.number().int().positive().optional(),
  depreciation_method: z.enum(["SL", "DB", "SYD", "UOP", "NONE"]),
  department_id: z.string().trim().min(1).optional(),
  custodian_user_id: z.string().trim().min(1).optional(),
  // Use vendor name and supplier invoice number instead of IDs in the form
  vendor_name: z.string().trim().optional(),
  supplier_invoice_number: z.string().trim().optional(),
  // Optional file upload for supplier invoice image (will be handled as File in the form)
  supplier_invoice_image: z.any().optional(),
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
