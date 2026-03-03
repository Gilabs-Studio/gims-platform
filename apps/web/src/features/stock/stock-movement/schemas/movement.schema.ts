import * as z from "zod";

export const stockMovementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUST", "TRANSFER"]),
  product_id: z.string().min(1, "Product is required"),
  warehouse_id: z.string().min(1, "Warehouse is required"),
  target_warehouse_id: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  reference_number: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === "TRANSFER") {
      return !!data.target_warehouse_id;
    }
    return true;
  },
  {
    message: "Target Warehouse is required for Transfer",
    path: ["target_warehouse_id"],
  }
).refine(
  (data) => {
    if (data.type === "TRANSFER" && data.warehouse_id === data.target_warehouse_id) {
      return false;
    }
    return true;
  },
  {
    message: "Source and Target Warehouse cannot be the same",
    path: ["target_warehouse_id"],
  }
);

export type StockMovementFormData = z.infer<typeof stockMovementSchema>;
