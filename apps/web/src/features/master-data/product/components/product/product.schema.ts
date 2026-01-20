import { z } from "zod";

export const productSchema = z.object({
  // Basic Info
  name: z.string().min(2, "Name is required").max(200),
  code: z.string().optional(),
  manufacturer_part_number: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  image_url: z.string().optional().nullable(),

  // Classification (all optional - nullable in backend)
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  segment_id: z.string().optional(),
  type_id: z.string().optional(),

  // UoM & Packaging (all optional - nullable in backend)
  uom_id: z.string().optional(),
  purchase_uom_id: z.string().optional(),
  packaging_id: z.string().optional().nullable(),
  purchase_uom_conversion: z.number().min(0.0001, "Conversion factor must be > 0"),

  // Procurement & Supply (all optional - nullable in backend)
  procurement_type_id: z.string().optional(),
  supplier_id: z.string().optional(),
  business_unit_id: z.string().optional(),
  tax_type: z.string().optional(),
  is_tax_inclusive: z.boolean(),
  lead_time_days: z.number().int().min(0),

  // Pricing & Stock
  cost_price: z.number().min(0, "Purchase Price must be >= 0"),
  min_stock: z.number().min(0),
  max_stock: z.number().min(0),

  // Status
});

export type ProductFormData = z.infer<typeof productSchema>;
