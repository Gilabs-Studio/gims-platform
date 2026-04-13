import { z } from "zod";

export const recipeItemSchema = z.object({
  ingredient_product_id: z.string().min(1, "Ingredient is required"),
  quantity: z.number().positive("Quantity must be > 0"),
  uom_id: z.string().optional().nullable(),
  notes: z.string().optional(),
  sort_order: z.number().int().min(0).optional(),
});

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

  // POS F&B fields
  product_kind: z.enum(["STOCK", "RECIPE", "SERVICE"]).optional(),
  is_ingredient: z.boolean().optional(),
  is_inventory_tracked: z.boolean().optional(),
  is_pos_available: z.boolean().optional(),
  recipe_items: z.array(recipeItemSchema).optional(),

  // Status
}).refine(
  (data) => {
    if (data.product_kind === "RECIPE") {
      return data.recipe_items && data.recipe_items.length > 0;
    }
    return true;
  },
  {
    message: "RECIPE products must have at least one recipe item",
    path: ["recipe_items"],
  }
);

export type ProductFormData = z.infer<typeof productSchema>;
export type RecipeItemFormData = z.infer<typeof recipeItemSchema>;
