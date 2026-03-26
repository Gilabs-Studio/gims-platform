import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateWarehouse, useUpdateWarehouse, useWarehouse } from "./use-warehouses";
import type { Warehouse } from "../types";

export const warehouseFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  capacity: z.number().min(0).optional().nullable(),
  address: z.string().max(500).optional(),
  province_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  village_name: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
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

  const { data: detailRes, isLoading: isLoadingDetail, refetch: refetchDetail } = useWarehouse(
    isEditing ? (editingItem.id ?? "") : "",
    { enabled: false, staleTime: 0 }
  );
  const fullWarehouse = detailRes?.data ?? editingItem;

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      capacity: null,
      address: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      village_name: "",
      latitude: -6.2088,
      longitude: 106.8456,
      is_active: true,
    },
  });

  // Single effect: fetch first, then reset — eliminates race condition on re-open
  useEffect(() => {
    if (!open) return;

    if (isEditing && editingItem?.id) {
      void refetchDetail().then((result) => {
        const entity = result.status === "success" && result.data?.data
          ? result.data.data
          : editingItem;
        if (!entity) return;

        const warehouse: Warehouse = entity;

        form.reset({
          code: warehouse.code,
          name: warehouse.name,
          description: warehouse.description ?? "",
          capacity: warehouse.capacity ?? null,
          address: warehouse.address ?? "",
          province_id: warehouse.province_id ?? warehouse.village?.district?.city?.province?.id,
          city_id: warehouse.city_id ?? warehouse.village?.district?.city?.id,
          district_id: warehouse.district_id ?? warehouse.village?.district?.id,
          village_name: warehouse.village_name ?? "",
          latitude: warehouse.latitude ?? -6.2088,
          longitude: warehouse.longitude ?? 106.8456,
          is_active: true,
        });
      });
    } else if (!isEditing) {
      form.reset({
        code: "",
        name: "",
        description: "",
        capacity: null,
        address: "",
        province_id: undefined,
        city_id: undefined,
        district_id: undefined,
        village_name: "",
        latitude: -6.2088,
        longitude: 106.8456,
        is_active: true,
      });
    }
  }, [open, isEditing, editingItem, editingItem?.id, refetchDetail, form]);

  const onSubmit: SubmitHandler<WarehouseFormData> = async (data) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        capacity: data.capacity ?? undefined,
        address: data.address || undefined,
        province_id: data.province_id || undefined,
        city_id: data.city_id || undefined,
        district_id: data.district_id || undefined,
        village_name: data.village_name || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: true,
      };

      if (isEditing && fullWarehouse) {
        await updateWarehouse.mutateAsync({ id: fullWarehouse.id, data: payload });
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

  const isLoading = createWarehouse.isPending || updateWarehouse.isPending || isLoadingDetail;

  return {
    form,
    t,
    tCommon,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
