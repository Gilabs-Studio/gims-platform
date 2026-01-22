import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Sales Quotation Item Schema
export const getQuotationItemSchema = (t?: TranslationFn) => z.object({
  product_id: z.string().uuid(getMsg(t, "validation.invalidId", "Invalid product ID")),
  quantity: z.number()
    .positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0"))
    .min(0.001, getMsg(t, "validation.quantityMin", "Quantity must be at least 0.001")),
  price: z.number()
    .positive(getMsg(t, "validation.pricePositive", "Price must be greater than 0"))
    .min(0.01, getMsg(t, "validation.priceMin", "Price must be at least 0.01")),
  discount: z.number()
    .min(0, getMsg(t, "validation.discountMin", "Discount cannot be negative"))
    .default(0),
});

// Sales Quotation Schema
export const getQuotationSchema = (t?: TranslationFn) => z.object({
  quotation_date: z.string()
    .min(1, getMsg(t, "validation.required", "Quotation date is required")),
  valid_until: z.string().optional(),
  payment_terms_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid payment terms ID"))
    .min(1, getMsg(t, "validation.required", "Payment terms is required")),
  sales_rep_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid sales rep ID"))
    .min(1, getMsg(t, "validation.required", "Sales representative is required")),
  business_unit_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid business unit ID"))
    .min(1, getMsg(t, "validation.required", "Business unit is required")),
  business_type_id: z.string().uuid().optional(),
  tax_rate: z.number()
    .min(0, getMsg(t, "validation.taxRateMin", "Tax rate cannot be negative"))
    .max(100, getMsg(t, "validation.taxRateMax", "Tax rate cannot exceed 100%"))
    .default(11),
  delivery_cost: z.number()
    .min(0, getMsg(t, "validation.deliveryCostMin", "Delivery cost cannot be negative"))
    .default(0),
  other_cost: z.number()
    .min(0, getMsg(t, "validation.otherCostMin", "Other cost cannot be negative"))
    .default(0),
  discount_amount: z.number()
    .min(0, getMsg(t, "validation.discountAmountMin", "Discount amount cannot be negative"))
    .default(0),
  notes: z.string().optional(),
  items: z.array(getQuotationItemSchema(t))
    .min(1, getMsg(t, "validation.itemsMin", "At least one item is required")),
});

export const getUpdateQuotationSchema = (t?: TranslationFn) => getQuotationSchema(t).partial().extend({
  items: z.array(getQuotationItemSchema(t)).min(1).optional(),
});

export const getUpdateQuotationStatusSchema = (t?: TranslationFn) => z.object({
  status: z.enum(["sent", "approved", "rejected", "converted"], {
    errorMap: () => ({ message: getMsg(t, "validation.invalidStatus", "Invalid status") }),
  }),
  rejection_reason: z.string().optional(),
});

// Inferred types
export type CreateQuotationFormData = z.infer<ReturnType<typeof getQuotationSchema>>;
export type UpdateQuotationFormData = z.infer<ReturnType<typeof getUpdateQuotationSchema>>;
export type UpdateQuotationStatusFormData = z.infer<ReturnType<typeof getUpdateQuotationStatusSchema>>;
export type QuotationItemFormData = z.infer<ReturnType<typeof getQuotationItemSchema>>;
