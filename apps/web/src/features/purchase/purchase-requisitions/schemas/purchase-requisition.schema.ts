import { z } from "zod";

const purchaseRequisitionItemSchema = z.object({
  product_id: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  purchase_price: z.number().min(0, "Purchase price must be 0 or greater"),
  discount: z.number().min(0, "Discount must be 0 or greater").max(100, "Discount cannot exceed 100%"),
  notes: z.string().optional(),
});

export const createPurchaseRequisitionSchema = z.object({
  supplier_id: z.number().min(1, "Supplier is required"),
  payment_terms_id: z.number().min(1, "Payment terms is required"),
  business_unit_id: z.number().min(1, "Business unit is required"),
  request_date: z.string().min(1, "Request date is required"),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater").max(100, "Tax rate cannot exceed 100%"),
  delivery_cost: z.number().min(0, "Delivery cost must be 0 or greater"),
  other_cost: z.number().min(0, "Other cost must be 0 or greater"),
  notes: z.string().optional(),
  address: z.string().optional(),
  requested_by: z.number().min(1, "Requested by is required"),
  items: z
    .array(purchaseRequisitionItemSchema)
    .min(1, "At least one item is required"),
});

export const updatePurchaseRequisitionSchema = z.object({
  supplier_id: z.number().min(1, "Supplier is required").optional(),
  payment_terms_id: z.number().min(1, "Payment terms is required").optional(),
  business_unit_id: z.number().min(1, "Business unit is required").optional(),
  request_date: z.string().min(1, "Request date is required").optional(),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater").max(100, "Tax rate cannot exceed 100%").optional(),
  delivery_cost: z.number().min(0, "Delivery cost must be 0 or greater").optional(),
  other_cost: z.number().min(0, "Other cost must be 0 or greater").optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  requested_by: z.number().min(1, "Requested by is required").optional(),
  items: z
    .array(purchaseRequisitionItemSchema)
    .min(1, "At least one item is required")
    .optional(),
});

export type CreatePurchaseRequisitionFormData = z.infer<typeof createPurchaseRequisitionSchema>;
export type UpdatePurchaseRequisitionFormData = z.infer<typeof updatePurchaseRequisitionSchema>;

