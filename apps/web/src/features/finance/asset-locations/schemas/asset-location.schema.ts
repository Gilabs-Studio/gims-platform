import { z } from "zod";

export const assetLocationFormSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export type AssetLocationFormValues = z.infer<typeof assetLocationFormSchema>;
