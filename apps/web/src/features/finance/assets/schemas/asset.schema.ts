import { z } from "zod";

export const assetFormSchema = z.object({
  code: z.string().trim().optional(),
  name: z.string().trim().min(1),
  asset_type_id: z.enum(["FIXED", "CURRENT", "INTANGIBLE", "OTHER"]),
  asset_category_id: z.string().trim().min(1),
  location_id: z.string().trim().min(1),
  acquisition_date: z.string().trim().min(1),
  purchase_price: z.number().nonnegative().optional(),
  acquisition_cost: z.number().positive(),
  salvage_value: z.number().nonnegative().optional(),
  shipping_cost: z.number().nonnegative().optional(),
  installation_cost: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  other_costs: z.number().nonnegative().optional(),
  useful_life_months: z.number().int().positive().optional(),
  depreciation_method: z.enum(["SL", "DB", "SYD", "UOP", "NONE"]),
  department_id: z.string().trim().min(1).optional(),
  custodian_user_id: z.string().trim().min(1).optional(),
  assigned_to_employee_id: z.string().trim().min(1).optional(),
  parent_asset_id: z.string().trim().min(1).optional(),
  serial_number: z.string().trim().optional(),
  description: z.string().trim().optional(),
  vendor_id: z.string().trim().optional(),
  vendor_name: z.string().trim().optional(),
  supplier_invoice_number: z.string().trim().optional(),
  // Optional file upload for supplier invoice image (will be handled as File in the form)
  supplier_invoice_image: z.any().optional(),
  warranty_start: z.string().trim().optional(),
  warranty_end: z.string().trim().optional(),
  warranty_provider: z.string().trim().optional(),
  warranty_terms: z.string().trim().optional(),
  insurance_policy_number: z.string().trim().optional(),
  insurance_provider: z.string().trim().optional(),
  insurance_start: z.string().trim().optional(),
  insurance_end: z.string().trim().optional(),
  insurance_value: z.number().nonnegative().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const depreciateAssetSchema = z.object({
  as_of_date: z.string().trim().min(1),
});

export type DepreciateAssetValues = z.infer<typeof depreciateAssetSchema>;

export const transferAssetSchema = z.object({
  // New transfer contract supporting approval workflow
  to_location_id: z.string().uuid(),
  to_department_id: z.string().or(z.literal("")).optional(),
  custodian_user_id: z.string().or(z.literal("")).optional(),
  is_intercompany: z.boolean().default(false).optional(),
  effective_date: z.string().trim().min(1),
  notes: z.string().optional(),
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
