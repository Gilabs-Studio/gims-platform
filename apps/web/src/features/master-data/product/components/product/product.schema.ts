import { z } from "zod";

export const productSchema = z.object({
  // Basic Info
  name: z.string().min(2, "Name is required").max(200),
  code: z.string().min(1, "Internal Code is required").max(50),
  manufacturer_part_number: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),

  // Classification
  category_id: z.string().min(1, "Category is required"),
  brand_id: z.string().min(1, "Brand is required"),
  segment_id: z.string().min(1, "Segment is required"),
  type_id: z.string().min(1, "Type is required"),

  // UoM & Packaging
  uom_id: z.string().min(1, "Base UoM is required"),
  purchase_uom_id: z.string().min(1, "Purchase UoM is required"),
  packaging_id: z.string().optional().nullable(),
  purchase_uom_conversion: z.number().min(0.0001, "Conversion factor must be > 0"),

  // Procurement & Supply
  procurement_type_id: z.string().min(1, "Procurement Type is required"),
  supplier_id: z.string().min(1, "Supplier is required"),
  business_unit_id: z.string().min(1, "Business Unit is required"),
  tax_type: z.string().optional(),
  is_tax_inclusive: z.boolean().default(false),
  lead_time_days: z.number().int().min(0).default(0),

  // Pricing & Stock
  cost_price: z.number().min(0, "Purchase Price must be >= 0"),
  min_stock: z.number().min(0),
  max_stock: z.number().min(0),

  // Status
  is_active: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;
