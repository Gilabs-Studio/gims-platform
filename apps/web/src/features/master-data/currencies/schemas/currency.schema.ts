import { z } from "zod";

export const currencyFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code cannot exceed 10 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  symbol: z.string().max(10, "Symbol cannot exceed 10 characters").optional(),
  decimal_places: z.number().int().min(0, "Decimal places cannot be negative").max(6, "Decimal places cannot exceed 6"),
  is_active: z.boolean(),
});

export type CurrencyFormValues = z.infer<typeof currencyFormSchema>;