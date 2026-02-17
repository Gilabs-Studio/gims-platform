import { z } from "zod";

export const assetLocationFormSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
});

export type AssetLocationFormValues = z.infer<typeof assetLocationFormSchema>;
