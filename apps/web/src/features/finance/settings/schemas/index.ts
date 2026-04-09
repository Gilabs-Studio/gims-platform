import { z } from "zod";

export const upsertFinanceSettingSchema = z.object({
  setting_key: z.string().min(1, { message: "Key is required" }),
  value: z.string().trim().optional().default(""),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const batchUpsertFinanceSettingsSchema = z.object({
  settings: z.array(upsertFinanceSettingSchema),
});

export type BatchUpsertFinanceSettingsFormData = z.infer<typeof batchUpsertFinanceSettingsSchema>;
