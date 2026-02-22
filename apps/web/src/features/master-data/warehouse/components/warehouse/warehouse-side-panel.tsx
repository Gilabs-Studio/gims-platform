"use client";

import { Drawer } from "@/components/ui/drawer";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";

import { useCreateWarehouse, useUpdateWarehouse } from "../../hooks/use-warehouses";
import { useProvinces } from "../../../geographic/hooks/use-provinces";
import { useCities } from "../../../geographic/hooks/use-cities";
import { useDistricts } from "../../../geographic/hooks/use-districts";
import { useVillages } from "../../../geographic/hooks/use-villages";
import type { Warehouse } from "../../types";

const formSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  capacity: z.number().min(0).optional().nullable(),
  address: z.string().max(500).optional(),
  province_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  village_id: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;
type PanelMode = "create" | "edit" | "view";

interface WarehouseSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly warehouse?: Warehouse | null;
  readonly onSuccess?: () => void;
}

export function WarehouseSidePanel({
  isOpen,
  onClose,
  mode,
  warehouse,
  onSuccess,
}: WarehouseSidePanelProps) {
  const t = useTranslations("warehouse");
  // tCommon alias for backward compatibility with codebase patterns
  const tCommon = useTranslations("warehouse");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      capacity: null,
      address: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      village_id: "",
      latitude: -6.2088,
      longitude: 106.8456,
      is_active: true,
    },
  });

  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const isActive = watch("is_active");

  const { data: provincesData } = useProvinces({ per_page: 100 });
  const { data: citiesData } = useCities(
    provinceId ? { province_id: String(provinceId), per_page: 100 } : undefined
  );
  const { data: districtsData } = useDistricts(
    cityId ? { city_id: String(cityId), per_page: 100 } : undefined
  );
  const { data: villagesData } = useVillages(
    districtId ? { district_id: String(districtId), per_page: 100 } : undefined
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];
  const villages = villagesData?.data ?? [];

  useEffect(() => {
    if (warehouse && (mode === "edit" || mode === "view")) {
      const v = warehouse.village;
      const d = v?.district;
      const c = d?.city;
      const p = c?.province;

      reset({
        code: warehouse.code,
        name: warehouse.name,
        description: warehouse.description ?? "",
        capacity: warehouse.capacity ?? null,
        address: warehouse.address ?? "",
        province_id: p?.id,
        city_id: c?.id,
        district_id: d?.id,
        village_id: warehouse.village_id ?? "",
        latitude: warehouse.latitude ?? -6.2088,
        longitude: warehouse.longitude ?? 106.8456,
        is_active: warehouse.is_active,
      });
    } else if (mode === "create") {
      reset({
        code: "",
        name: "",
        description: "",
        capacity: null,
        address: "",
        village_id: "",
        latitude: -6.2088,
        longitude: 106.8456,
        is_active: true,
      });
    }
  }, [warehouse, mode, reset, isOpen]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        capacity: data.capacity ?? undefined,
        address: data.address || undefined,
        village_id: data.village_id || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active,
      };

      if (isEditing && warehouse) {
        await updateWarehouse.mutateAsync({ id: warehouse.id, data: payload });
      } else {
        await createWarehouse.mutateAsync(payload);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to save warehouse:", error);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
    setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
  };

  const handleProvinceChange = (val: string) => {
    setValue("province_id", val);
    setValue("city_id", undefined);
    setValue("district_id", undefined);
    setValue("village_id", undefined);
  };

  const handleCityChange = (val: string) => {
    setValue("city_id", val);
    setValue("district_id", undefined);
    setValue("village_id", undefined);
  };

  const handleDistrictChange = (val: string) => {
    setValue("district_id", val);
    setValue("village_id", undefined);
  };

  const isLoading = createWarehouse.isPending || updateWarehouse.isPending;

  const panelTitle = isViewing
    ? warehouse?.name ?? t("warehouse.title")
    : isEditing
      ? t("warehouse.editTitle")
      : t("warehouse.createTitle");

  return (
    <>
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={panelTitle}
        side="right"
        defaultWidth={550}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20 p-4">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("warehouse.sections.basicInfo")}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.code")} *</FieldLabel>
                <Input
                  placeholder={t("warehouse.form.codePlaceholder")}
                  {...register("code")}
                  disabled={isViewing}
                />
                {errors.code && <FieldError>{errors.code.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.name")} *</FieldLabel>
                <Input
                  placeholder={t("warehouse.form.namePlaceholder")}
                  {...register("name")}
                  disabled={isViewing}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.description")}</FieldLabel>
              <Textarea
                placeholder={t("warehouse.form.descriptionPlaceholder")}
                {...register("description")}
                rows={2}
                disabled={isViewing}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.capacity")}</FieldLabel>
              <Controller
                control={control}
                name="capacity"
                render={({ field }) => (
                  <Input
                    type="number"
                    placeholder={t("warehouse.form.capacityPlaceholder")}
                    disabled={isViewing}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || null)}
                  />
                )}
              />
            </Field>

            {!isViewing && (
              <Field
                orientation="horizontal"
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <FieldLabel>{t("warehouse.form.isActive")}</FieldLabel>
                <Switch
                  checked={isActive}
                  onCheckedChange={(val) => setValue("is_active", val)}
                />
              </Field>
            )}
          </div>

          {/* Location Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("warehouse.sections.location")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.address")}</FieldLabel>
              <Textarea
                placeholder={t("warehouse.form.addressPlaceholder")}
                {...register("address")}
                rows={2}
                disabled={isViewing}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.province")}</FieldLabel>
                <Select
                  value={String(provinceId || "")}
                  onValueChange={handleProvinceChange}
                  disabled={isViewing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.city")}</FieldLabel>
                <Select
                  value={String(cityId || "")}
                  onValueChange={handleCityChange}
                  disabled={!provinceId || isViewing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.district")}</FieldLabel>
                <Select
                  value={String(districtId || "")}
                  onValueChange={handleDistrictChange}
                  disabled={!cityId || isViewing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.village")}</FieldLabel>
                <Select
                  value={String(watch("village_id") || "")}
                  onValueChange={(val) => setValue("village_id", val)}
                  disabled={!districtId || isViewing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Village" />
                  </SelectTrigger>
                  <SelectContent>
                    {villages.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Coordinates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <h3 className="text-sm font-medium">{t("warehouse.sections.coordinates")}</h3>
                </div>
                {!isViewing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="cursor-pointer"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {t("warehouse.pickFromMap")}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("warehouse.form.latitude")}</FieldLabel>
                  <Controller
                    control={control}
                    name="latitude"
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="any"
                        placeholder="-6.2088"
                        disabled={isViewing}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    )}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("warehouse.form.longitude")}</FieldLabel>
                  <Controller
                    control={control}
                    name="longitude"
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="any"
                        placeholder="106.8456"
                        disabled={isViewing}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    )}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isViewing && (
            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  t("common.save")
                ) : (
                  t("common.create")
                )}
              </Button>
            </div>
          )}
        </form>
      </Drawer>

      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={latitude ?? -6.2088}
        longitude={longitude ?? 106.8456}
        onCoordinateSelect={handleCoordinateSelect}
        title={t("warehouse.mapPicker.title")}
        description={t("warehouse.mapPicker.description")}
      />
    </>
  );
}
