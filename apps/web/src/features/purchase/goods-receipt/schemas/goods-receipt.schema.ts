import { z } from "zod";

export const goodsReceiptItemSchema = z.object({
  purchase_order_item_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity_received: z.number().gte(0),
  notes: z.string().nullable().optional(),
});

export const goodsReceiptSchema = z
  .object({
    purchase_order_id: z.string().uuid(),
    notes: z.string().nullable().optional(),
    proof_image_url: z.string().nullable().optional(),
    items: z.array(goodsReceiptItemSchema).min(1),
  })
  .superRefine((val, ctx) => {
    const anyPositive = val.items.some((it) => typeof it.quantity_received === "number" && it.quantity_received > 0);
    if (!anyPositive) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "At least one item must have quantity > 0",
      });
    }
  });

export type GoodsReceiptFormData = z.infer<typeof goodsReceiptSchema>;
