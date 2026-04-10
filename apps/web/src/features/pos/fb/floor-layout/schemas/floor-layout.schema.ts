import { z } from "zod";

type TranslationFn = (key: string) => string;

export const getCreateFloorPlanSchema = (t?: TranslationFn) =>
  z.object({
    outlet_id: z.string().uuid(t?.("validation.companyRequired") ?? "Outlet is required"),
    name: z
      .string()
      .min(2, t?.("validation.nameMin") ?? "Name must be at least 2 characters")
      .max(200),
    floor_number: z
      .number()
      .int()
      .min(1, t?.("validation.floorMin") ?? "Floor number must be at least 1")
      .max(99),
    grid_size: z.number().int().min(5).max(100).optional(),
    snap_to_grid: z.boolean().optional(),
    width: z.number().int().min(400).max(4000).optional(),
    height: z.number().int().min(300).max(3000).optional(),
  });

export type CreateFloorPlanFormData = z.infer<
  ReturnType<typeof getCreateFloorPlanSchema>
>;
