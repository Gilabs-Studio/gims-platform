import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateWarehouse, useUpdateWarehouse, useWarehouse } from "./use-warehouses";
import { useProvinces } from "../../geographic/hooks/use-provinces";
import { useCities } from "../../geographic/hooks/use-cities";
import { useDistricts } from "../../geographic/hooks/use-districts";
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

  const provinceId = form.watch("province_id");
  const cityId = form.watch("city_id");
  const districtId = form.watch("district_id");

  const { data: provincesData } = useProvinces({ per_page: 100 }, { enabled: open });
  const { data: citiesData } = useCities(
    cityId || provinceId ? { province_id: String(provinceId), per_page: 100 } : undefined,
    { enabled: open && !!provinceId }
  );
  const { data: districtsData } = useDistricts(
    districtId || cityId ? { city_id: String(cityId), per_page: 100 } : undefined,
    { enabled: open && !!cityId }
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];

  // Single effect: fetch first, then reset — eliminates race condition on re-open
  useEffect(() => {
    if (!open) return;

    if (isEditing && editingItem?.id) {
      void refetchDetail().then((result) => {
        const entity = result.status === "success" && result.data?.data
          ? result.data.data
          : editingItem;
        if (!entity) return;
        
        const v = entity.village;
        const d = v?.district;
        const c = d?.city;
        const p = c?.province;

        form.reset({
          code: entity.code,
          name: entity.name,
          description: entity.description ?? "",
          capacity: entity.capacity ?? null,
          address: entity.address ?? "",
          province_id: (entity as any).province_id || entity.village?.district?.city?.province?.id,
          city_id: (entity as any).city_id || entity.village?.district?.city?.id,
          district_id: (entity as any).district_id || entity.village?.district?.id,
          village_name: entity.village_name ?? "",
          latitude: entity.latitude ?? -6.2088,
          longitude: entity.longitude ?? 106.8456,
          is_active: entity.is_active,
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
  }, [open, isEditing, editingItem?.id, refetchDetail, form]);

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
        is_active: data.is_active,
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

  const handleProvinceChange = (val: string) => {
    form.setValue("province_id", val);
    form.setValue("city_id", undefined);
    form.setValue("district_id", undefined);
  };

  const handleCityChange = (val: string) => {
    form.setValue("city_id", val);
    form.setValue("district_id", undefined);
  };

  const handleDistrictChange = (val: string) => {
    form.setValue("district_id", val);
  };

  const isLoading = createWarehouse.isPending || updateWarehouse.isPending || isLoadingDetail;

  return {
    form,
    t,
    tCommon,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
    actions: {
      handleProvinceChange,
      handleCityChange,
      handleDistrictChange,
    },
    data: {
      provinces,
      cities,
      districts,
    }
  };
}
