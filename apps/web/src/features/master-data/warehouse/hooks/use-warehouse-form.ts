import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateWarehouse, useUpdateWarehouse } from "./use-warehouses";
import type { Warehouse } from "../types";

export const warehouseFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  capacity: z.number().min(0).optional().nullable(),
  address: z.string().max(500).optional(),
  is_active: z.boolean(),
});

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;

export interface UseWarehouseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Warehouse | null;
}

export function useWarehouseForm({ open, onOpenChange, editingItem }: UseWarehouseFormProps) {
  const t = useTranslations("warehouse");
  // tCommon alias
  const tCommon = useTranslations("warehouse");
  const isEditing = !!editingItem;

  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      capacity: null,
      address: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        code: editingItem.code,
        name: editingItem.name,
        description: editingItem.description ?? "",
        capacity: editingItem.capacity ?? null,
        address: editingItem.address ?? "",
        is_active: editingItem.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        capacity: null,
        address: "",
        is_active: true,
      });
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<WarehouseFormData> = async (data) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        capacity: data.capacity ?? undefined,
        address: data.address || undefined,
        is_active: data.is_active,
      };

      if (isEditing && editingItem) {
        await updateWarehouse.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(t("warehouse.updateSuccess", { fallback: "Warehouse updated successfully" }));
      } else {
        await createWarehouse.mutateAsync(payload);
        toast.success(t("warehouse.createSuccess", { fallback: "Warehouse created successfully" }));
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save warehouse:", error);
      toast.error(tCommon("common.error_update", { fallback: "Failed to update warehouse" }));
    }
  };

  const isLoading = createWarehouse.isPending || updateWarehouse.isPending;

  return {
    form,
    t,
    tCommon,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
