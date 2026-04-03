import { z } from "zod";

export const upsertFinanceSettingSchema = z.object({
  setting_key: z.string().min(1, { message: "Key is required" }),
  value: z.string().min(1, { message: "Value is required. Please map this to a valid Chart of Account." }),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const batchUpsertFinanceSettingsSchema = z.object({
  settings: z.array(upsertFinanceSettingSchema),
});

export type BatchUpsertFinanceSettingsFormData = z.infer<typeof batchUpsertFinanceSettingsSchema>;
