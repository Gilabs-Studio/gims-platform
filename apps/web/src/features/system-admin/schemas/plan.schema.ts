import { z } from "zod";

const roleTemplateSchema = z.object({
  code: z.string().optional().default(""),
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional().default(""),
});

export const planSchema = z.object({
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  category: z.enum(["pos", "erp", "crm", "hr", "bundle"]),
  description: z.string().optional().default(""),
  billing_type: z.enum(["per_user", "flat"]),
  price_monthly_idr: z.coerce.number().min(0, "Monthly price cannot be negative"),
  price_yearly_idr: z.coerce.number().min(0, "Yearly price cannot be negative"),
  min_users: z.coerce.number().min(1, "Minimum 1 user"),
  max_users: z.coerce.number().min(1, "Minimum 1 user"),
  is_active: z.boolean().default(true),
  is_highlighted: z.boolean().default(false),
  sort_order: z.coerce.number().default(0),
  features: z.array(z.string()).default([]),
  role_templates: z.array(roleTemplateSchema).min(1, "Add at least one role template"),
  menu_urls: z.array(z.string()).min(1, "Select at least one menu URL"),
});

export type PlanFormData = z.infer<typeof planSchema>;
export type PlanFormValues = z.input<typeof planSchema>;
