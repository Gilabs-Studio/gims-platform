import { z } from "zod";

export const purchaseReturnItemSchema = z.object({
  goods_receipt_item_id: z.string().optional(),
  product_id: z.string().min(1),
  uom_id: z.string().optional(),
  condition: z.string().min(1),
  qty: z.number().positive(),
  unit_cost: z.number().min(0),
});

export const purchaseReturnSchema = z.object({
  goods_receipt_id: z.string().min(1),
  purchase_order_id: z.string().optional(),
  supplier_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  reason: z.string().min(1),
  action: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(purchaseReturnItemSchema).min(1),
});

export type PurchaseReturnFormData = z.infer<typeof purchaseReturnSchema>;
