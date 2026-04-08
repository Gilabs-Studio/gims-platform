import { z } from "zod";

const uuidLikeRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidLike = () => z.string().regex(uuidLikeRegex);

export const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().gt(0),
  price: z.number().gte(0),
  discount: z.number().gte(0).lte(100).optional(),
  notes: z.string().nullable().optional(),
});

export const purchaseOrderSchema = z.object({
  source: z.enum(["manual", "pr", "so"]).default("manual"),
  supplier_id: uuidLike().nullable().optional().or(z.literal("").transform(() => null)),
  supplier_contact_id: uuidLike().nullable().optional().or(z.literal("").transform(() => null)),
  payment_terms_id: uuidLike().nullable().optional().or(z.literal("").transform(() => null)),
  business_unit_id: uuidLike().nullable().optional().or(z.literal("").transform(() => null)),
  purchase_requisitions_id: uuidLike().nullable().optional().or(z.literal("").transform(() => null)),
  sales_order_id: uuidLike().nullable().optional().or(z.literal("").transform(() => null)),
  order_date: z.string().min(1),
  due_date: z.string().nullable().optional(),
  tax_rate: z.number().gte(0).lte(100).optional(),
  delivery_cost: z.number().gte(0).optional(),
  other_cost: z.number().gte(0).optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1),
}).superRefine((val, ctx) => {
  const pr = val.purchase_requisitions_id;
  const so = val.sales_order_id;

  if (val.source === "manual") {
    if (!val.supplier_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supplier_id"],
        message: "Required",
      });
    }
    if (pr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchase_requisitions_id"],
        message: "Must be empty for manual source",
      });
    }
    if (so) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sales_order_id"],
        message: "Must be empty for manual source",
      });
    }
  }

  if (val.source === "pr") {
    if (!pr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchase_requisitions_id"],
        message: "Required",
      });
    }
    if (so) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sales_order_id"],
        message: "Must be empty when source is PR",
      });
    }
  }

  if (val.source === "so") {
    if (!so) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sales_order_id"],
        message: "Required",
      });
    }
    if (pr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchase_requisitions_id"],
        message: "Must be empty when source is SO",
      });
    }
  }
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
