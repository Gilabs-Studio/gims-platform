"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, MapPin, Navigation, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

import { useCreateCompany, useUpdateCompany } from "../../hooks/use-companies";
import { useProvinces } from "../../../geographic/hooks/use-provinces";
import { useCities } from "../../../geographic/hooks/use-cities";
import { useDistricts } from "../../../geographic/hooks/use-districts";
import { useVillages } from "../../../geographic/hooks/use-villages";
import { getCompanySchema, type CompanyFormData } from "../../schemas/organization.schema";
import type { Company } from "../../types";

type PanelMode = "create" | "edit" | "view";

interface CompanySidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly company?: Company | null;
  readonly onSuccess?: () => void;
}

export function CompanySidePanel({
  isOpen,
  onClose,
  mode,
  company,
  onSuccess,
}: CompanySidePanelProps) {
  const t = useTranslations("organization");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(getCompanySchema(t)),
    defaultValues: {
      name: "",
      address: "",
      email: "",
      phone: "",
      npwp: "",
      nib: "",
      village_id: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      director_id: "",
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
    if (company && (mode === "edit" || mode === "view")) {
      const v = company.village;
      const d = v?.district;
      const c = d?.city;
      const p = c?.province;

      reset({
        name: company.name,
        address: company.address ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        npwp: company.npwp ?? "",
        nib: company.nib ?? "",
        village_id: company.village_id ?? "",
        province_id: p?.id,
        city_id: c?.id,
        district_id: d?.id,
        director_id: company.director_id ?? "",
        latitude: company.latitude ?? -6.2088,
        longitude: company.longitude ?? 106.8456,
        is_active: company.is_active,
      });
    } else if (mode === "create") {
      reset({
        name: "",
        address: "",
        email: "",
        phone: "",
        npwp: "",
        nib: "",
        village_id: "",
        director_id: "",
        latitude: -6.2088,
        longitude: 106.8456,
        is_active: true,
      });
    }
  }, [company, mode, reset, isOpen]);

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const payload = {
        name: data.name,
        address: data.address || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        npwp: data.npwp || undefined,
        nib: data.nib || undefined,
        village_id: data.village_id || undefined,
        director_id: data.director_id || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active,
      };

      if (isEditing && company) {
        await updateCompany.mutateAsync({ id: company.id, data: payload });
      } else {
        await createCompany.mutateAsync(payload);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to save company:", error);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setValue("latitude", lat, { shouldValidate: true });
    setValue("longitude", lng, { shouldValidate: true });
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

  const isLoading = createCompany.isPending || updateCompany.isPending;
  const isActive = watch("is_active");

  const panelTitle = isViewing
    ? company?.name ?? t("company.title")
    : isEditing
      ? t("company.editTitle")
      : t("company.createTitle");

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-[420px] bg-background border-l shadow-xl z-50 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <h2 className="font-semibold text-lg truncate">{panelTitle}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-65px)] overflow-y-auto p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">
                {t("company.sections.basicInfo")}
              </h3>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.name")}</FieldLabel>
                <Input
                  placeholder={t("company.form.namePlaceholder")}
                  {...register("name")}
                  disabled={isViewing}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.email")}</FieldLabel>
                <Input
                  type="email"
                  placeholder={t("company.form.emailPlaceholder")}
                  {...register("email")}
                  disabled={isViewing}
                />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.phone")}</FieldLabel>
                <Input
                  placeholder={t("company.form.phonePlaceholder")}
                  {...register("phone")}
                  disabled={isViewing}
                />
                {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.address")}</FieldLabel>
                <Textarea
                  placeholder={t("company.form.addressPlaceholder")}
                  {...register("address")}
                  rows={2}
                  disabled={isViewing}
                />
                {errors.address && <FieldError>{errors.address.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.npwp")}</FieldLabel>
                  <Input
                    placeholder={t("company.form.npwpPlaceholder")}
                    {...register("npwp")}
                    disabled={isViewing}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.nib")}</FieldLabel>
                  <Input
                    placeholder={t("company.form.nibPlaceholder")}
                    {...register("nib")}
                    disabled={isViewing}
                  />
                </Field>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">
                {t("company.sections.location")}
              </h3>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.province")}</FieldLabel>
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
                <FieldLabel>{t("company.form.city")}</FieldLabel>
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
                <FieldLabel>{t("company.form.district")}</FieldLabel>
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
                <FieldLabel>{t("company.form.village")}</FieldLabel>
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
                  <h3 className="text-sm font-medium">
                    {t("company.sections.coordinates")}
                  </h3>
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
                    {t("company.pickFromMap")}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.latitude")}</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    {...register("latitude", { valueAsNumber: true })}
                    placeholder="-6.2088"
                    disabled={isViewing}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.longitude")}</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    {...register("longitude", { valueAsNumber: true })}
                    placeholder="106.8456"
                    disabled={isViewing}
                  />
                </Field>
              </div>
            </div>

            {/* Active Status */}
            {!isViewing && (
              <Field
                orientation="horizontal"
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <FieldLabel>{t("company.form.isActive")}</FieldLabel>
                <Switch
                  checked={isActive}
                  onCheckedChange={(val) => setValue("is_active", val)}
                />
              </Field>
            )}

            {/* Actions */}
            {!isViewing && (
              <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
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
        </div>
      </div>

      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={latitude ?? -6.2088}
        longitude={longitude ?? 106.8456}
        onCoordinateSelect={handleCoordinateSelect}
        title={t("company.mapPicker.title")}
        description={t("company.mapPicker.description")}
      />
    </>
  );
}
