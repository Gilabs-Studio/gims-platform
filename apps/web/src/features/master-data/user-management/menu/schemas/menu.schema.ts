import { z } from "zod";

export const createMenuSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be less than 50 characters")
    .regex(/^[A-Z_]+$/, "Code must be uppercase letters and underscores only"),
  url_path: z.string().min(1, "URL path is required").max(255, "URL path must be less than 255 characters"),
  icon: z.string().min(1, "Icon is required").max(50, "Icon must be less than 50 characters"),
  order_no: z.number().int().min(1, "Order number must be at least 1"),
  is_active: z.boolean().default(true),
  parent_id: z.number().int().positive().nullable().optional(),
});

export const updateMenuSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be less than 50 characters")
    .regex(/^[A-Z_]+$/, "Code must be uppercase letters and underscores only")
    .optional(),
  url_path: z
    .string()
    .min(1, "URL path is required")
    .max(255, "URL path must be less than 255 characters")
    .optional(),
  icon: z.string().min(1, "Icon is required").max(50, "Icon must be less than 50 characters").optional(),
  order_no: z.number().int().min(1, "Order number must be at least 1").optional(),
  is_active: z.boolean().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
});

export type CreateMenuFormData = z.infer<typeof createMenuSchema>;
export type UpdateMenuFormData = z.infer<typeof updateMenuSchema>;
