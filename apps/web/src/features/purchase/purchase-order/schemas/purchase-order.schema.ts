import { z } from "zod";

const purchaseOrderItemSchema = z.object({
  product_id: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be 0 or greater"),
  discount: z.number().min(0, "Discount must be 0 or greater").max(100, "Discount cannot exceed 100%"),
});

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.number().min(1, "Supplier is required"),
  payment_terms_id: z.number().min(1, "Payment terms is required"),
  business_unit_id: z.number().min(1, "Business unit is required"),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater").max(100, "Tax rate cannot exceed 100%"),
  order_date: z.string().min(1, "Order date is required"),
  is_indent: z.boolean().optional(),
  delivery_cost: z.number().min(0, "Delivery cost must be 0 or greater"),
  other_cost: z.number().min(0, "Other cost must be 0 or greater"),
  notes: z.string().optional(),
  address: z.string().optional(),
  due_date: z.string().optional(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one item is required"),
  purchase_requisitions_id: z.number().nullable().optional(),
  sales_order_id: z.number().nullable().optional(),
});

export const updatePurchaseOrderSchema = z.object({
  supplier_id: z.number().min(1, "Supplier is required").optional(),
  payment_terms_id: z.number().min(1, "Payment terms is required").optional(),
  business_unit_id: z.number().min(1, "Business unit is required").optional(),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater").max(100, "Tax rate cannot exceed 100%").optional(),
  order_date: z.string().min(1, "Order date is required").optional(),
  is_indent: z.boolean().optional(),
  delivery_cost: z.number().min(0, "Delivery cost must be 0 or greater").optional(),
  other_cost: z.number().min(0, "Other cost must be 0 or greater").optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  due_date: z.string().optional(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one item is required")
    .optional(),
});

export type CreatePurchaseOrderFormData = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderFormData = z.infer<typeof updatePurchaseOrderSchema>;
