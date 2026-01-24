import { z } from "zod";

export const monthlyTargetSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  target_amount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export const getTargetSchema = (t: (key: string) => string) =>
  z.object({
    area_id: z.string().uuid(t("validation.invalidUUID")).optional(),
    year: z.coerce.number().min(2020).max(2100),
    total_target: z.coerce.number().min(0),
    notes: z.string().optional(),
    months: z.array(monthlyTargetSchema).length(12, t("validation.exactly12Months")),
  });

export const getUpdateTargetSchema = (t: (key: string) => string) =>
  getTargetSchema(t).partial().extend({
    months: z.array(monthlyTargetSchema).length(12).optional(),
  });

export type CreateTargetFormData = z.infer<ReturnType<typeof getTargetSchema>>;
export type UpdateTargetFormData = z.infer<ReturnType<typeof getUpdateTargetSchema>>;
