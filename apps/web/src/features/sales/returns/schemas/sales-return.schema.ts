import { z } from "zod";

type TranslationFn = (key: string) => string;

const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

export const getSalesReturnItemSchema = (t?: TranslationFn) => z.object({
  invoice_item_id: z.string().optional(),
  product_id: z.string()
    .min(1, getMsg(t, "validation.required", "Product is required")),
  uom_id: z.string().optional(),
  condition: z.string().min(1, getMsg(t, "validation.required", "Condition is required")),
  notes: z.string().optional(),
  qty: z.number().positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0")),
  unit_price: z.number().min(0, getMsg(t, "validation.priceMin", "Price must be positive")),
});

export const getSalesReturnSchema = (t?: TranslationFn) => z.object({
  invoice_id: z.string().optional(),
  delivery_id: z.string()
    .min(1, getMsg(t, "validation.required", "Delivery order is required")),
  warehouse_id: z.string()
    .min(1, getMsg(t, "validation.required", "Warehouse is required")),
  customer_id: z.string().optional(),
  reason: z.string().min(1, getMsg(t, "validation.required", "Reason is required")),
  action: z.string().min(1, getMsg(t, "validation.required", "Action is required")),
  notes: z.string().optional(),
  items: z.array(getSalesReturnItemSchema(t))
    .min(1, getMsg(t, "validation.itemsMin", "At least one item is required")),
});

export type SalesReturnFormData = z.infer<ReturnType<typeof getSalesReturnSchema>>;
