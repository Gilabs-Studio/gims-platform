import { z } from "zod";

type TranslationFn = (key: string) => string;

const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

export const getCustomerInvoiceDPSchema = (t?: TranslationFn) => z.object({
  sales_order_id: z.string()
    .min(1, getMsg(t, "validation.required", "Sales order is required"))
    .uuid(getMsg(t, "validation.invalidId", "Invalid sales order ID")),
  invoice_date: z.string().min(1, getMsg(t, "validation.required", "Invoice date is required")),
  due_date: z.string().min(1, getMsg(t, "validation.required", "Due date is required")),
  amount: z.number().positive(getMsg(t, "validation.amountPositive", "Amount must be greater than 0")),
  notes: z.string().nullable().optional(),
});

export type CustomerInvoiceDPFormData = z.infer<ReturnType<typeof getCustomerInvoiceDPSchema>>;
