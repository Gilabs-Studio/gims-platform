import { z } from "zod";

const goodsReceiptItemSchema = z.object({
  product_id: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  lot_number: z.string().optional(),
  expired_date: z.string().optional(),
});

export const createGoodsReceiptSchema = z.object({
  purchase_order_id: z.number().min(1, "Purchase order is required"),
  warehouse_id: z.number().min(1, "Warehouse is required"),
  receipt_date: z.string().min(1, "Receipt date is required"),
  notes: z.string().optional(),
  items: z
    .array(goodsReceiptItemSchema)
    .min(1, "At least one item is required"),
});

export const updateGoodsReceiptSchema = z.object({
  receipt_date: z.string().min(1, "Receipt date is required"),
  warehouse_id: z.number().min(1, "Warehouse is required"),
  notes: z.string().optional(),
  items: z
    .array(goodsReceiptItemSchema)
    .min(1, "At least one item is required"),
});

export type CreateGoodsReceiptFormData = z.infer<typeof createGoodsReceiptSchema>;
export type UpdateGoodsReceiptFormData = z.infer<typeof updateGoodsReceiptSchema>;




