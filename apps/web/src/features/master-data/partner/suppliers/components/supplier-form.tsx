"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Package, Phone, MapPin, Navigation, Loader2 } from "lucide-react";
import {
  createSupplierSchema,
  updateSupplierSchema,
  type CreateSupplierFormData,
  type UpdateSupplierFormData,
} from "../schemas/supplier.schema";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";
import { useSupplierAddData } from "../hooks/use-suppliers";
import type { Supplier } from "../types";
import { useState, useMemo, useEffect, useCallback } from "react";

export interface SupplierFormProps {
  readonly supplier?: Supplier;
  readonly onSubmit: (data: CreateSupplierFormData | UpdateSupplierFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function SupplierForm({ supplier, onSubmit, onCancel, isLoading }: SupplierFormProps) {
  const isEdit = !!supplier;
  const { data: addData, isLoading: isLoadingAddData } = useSupplierAddData();
  const t = useTranslations("suppliers.form");
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [locationDataReady, setLocationDataReady] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const provinces = useMemo(() => addData?.data?.provinces || [], [addData?.data?.provinces]);

  // Helper to find province and city from district
  const findLocationIds = useCallback(
    (districtId: number) => {
      if (!provinces || !districtId || provinces.length === 0) {
        return { provinceId: 0, cityId: 0 };
      }

      for (const province of provinces) {
        for (const city of province.cities || []) {
          for (const district of city.districts || []) {
            if (district.id === districtId) {
              return { provinceId: province.id, cityId: city.id };
            }
          }
        }
      }

      return { provinceId: 0, cityId: 0 };
    },
    [provinces],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateSupplierFormData | UpdateSupplierFormData>({
    resolver: zodResolver(isEdit ? updateSupplierSchema : createSupplierSchema),
    defaultValues: supplier
        ? (() => {
          const districtId = supplier.village?.district_id || 0;
          const { provinceId, cityId } = addData?.data?.provinces?.length
            ? findLocationIds(districtId)
            : { provinceId: 0, cityId: 0 };

          return {
            province_id: provinceId,
            city_id: cityId,
            district_id: districtId,
            village_id: supplier.village?.id || 0,
            name: supplier.name,
            address: supplier.address,
            contact_person: supplier.contact_person,
            phone: supplier.phone,
            email: supplier.email || "",
            latitude: supplier.latitude,
            longitude: supplier.longitude,
          };
        })()
      : {
          province_id: 0,
          city_id: 0,
          district_id: 0,
          village_id: 0,
          name: "",
          address: "",
          contact_person: "",
          phone: "",
          email: "",
          latitude: -6.2088,
          longitude: 106.8456,
        },
  });

  useEffect(() => {
    if (isEdit && supplier) {
      setLocationDataReady(false);
    }
  }, [supplier, isEdit]);

  useEffect(() => {
    if (isEdit && supplier && addData?.data?.provinces?.length && !locationDataReady) {
      const districtId = supplier.village?.district_id || 0;
      const { provinceId, cityId } = findLocationIds(districtId);

      reset(
        {
          province_id: provinceId,
          city_id: cityId,
          district_id: districtId,
          village_id: supplier.village?.id || 0,
          name: supplier.name,
          address: supplier.address,
          contact_person: supplier.contact_person,
          phone: supplier.phone,
          email: supplier.email || "",
          latitude: supplier.latitude,
          longitude: supplier.longitude,
        },
        { keepDefaultValues: false },
      );

      setLocationDataReady(true);
    } else if (isEdit && supplier && !addData?.data?.provinces?.length) {
      setLocationDataReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier?.id, isEdit, addData?.data?.provinces?.length, reset, isLoadingAddData, findLocationIds]);

  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const villageId = watch("village_id");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const availableCities = useMemo(() => {
    if (!provinces || !provinceId) return [];
    const province = provinces.find((p) => p.id === provinceId);
    return province?.cities || [];
  }, [provinces, provinceId]);

  const availableDistricts = useMemo(() => {
    if (!availableCities || !cityId) return [];
    const city = availableCities.find((c) => c.id === cityId);
    return city?.districts || [];
  }, [availableCities, cityId]);

  const availableVillages = useMemo(() => {
    if (!availableDistricts || !districtId) return [];
    const district = availableDistricts.find((d) => d.id === districtId);
    return district?.villages || [];
  }, [availableDistricts, districtId]);

  const handleFormSubmit = async (data: CreateSupplierFormData | UpdateSupplierFormData) => {
    const formData = { ...data };
    if (logoFile) {
      formData.logo = logoFile;
    }
    await onSubmit(formData);
  };

  const handleMapCoordinateSelect = (lat: number, lng: number) => {
    setValue("latitude", lat, { shouldValidate: true });
    setValue("longitude", lng, { shouldValidate: true });
  };

  const handleProvinceChange = (value: string) => {
    const id = parseInt(value);
    setValue("province_id", id, { shouldValidate: true });
    setValue("city_id", 0, { shouldValidate: true });
    setValue("district_id", 0, { shouldValidate: true });
    setValue("village_id", 0, { shouldValidate: true });
  };

  const handleCityChange = (value: string) => {
    const id = parseInt(value);
    setValue("city_id", id, { shouldValidate: true });
    setValue("district_id", 0, { shouldValidate: true });
    setValue("village_id", 0, { shouldValidate: true });
  };

  const handleDistrictChange = (value: string) => {
    const id = parseInt(value);
    setValue("district_id", id, { shouldValidate: true });
    setValue("village_id", 0, { shouldValidate: true });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
    }
  };

  if (isLoadingAddData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("basicInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("nameLabel")} *</FieldLabel>
            <Input {...register("name")} placeholder={t("namePlaceholder")} />
            <FieldDescription>{t("nameDescription")}</FieldDescription>
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("contactPersonLabel")} *</FieldLabel>
            <Input {...register("contact_person")} placeholder={t("contactPersonPlaceholder")} />
            {errors.contact_person && <FieldError>{errors.contact_person.message}</FieldError>}
          </Field>
        </div>

        <Field orientation="vertical">
          <FieldLabel>{t("logoLabel")}</FieldLabel>
          <Input type="file" accept="image/*" onChange={handleLogoChange} />
          <FieldDescription>{t("logoDescription")}</FieldDescription>
        </Field>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <Phone className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("contactInfo.title")}</h3>
        </div>

        <Field orientation="vertical">
          <FieldLabel>{t("addressLabel")} *</FieldLabel>
          <Input {...register("address")} placeholder={t("addressPlaceholder")} />
          <FieldDescription>{t("addressDescription")}</FieldDescription>
          {errors.address && <FieldError>{errors.address.message}</FieldError>}
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("phoneLabel")} *</FieldLabel>
            <Input {...register("phone")} placeholder={t("phonePlaceholder")} />
            <FieldDescription>{t("phoneDescription")}</FieldDescription>
            {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("emailLabel")}</FieldLabel>
            <Input type="email" {...register("email")} placeholder={t("emailPlaceholder")} />
            <FieldDescription>{t("emailDescription")}</FieldDescription>
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Location Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("locationInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("provinceLabel")} *</FieldLabel>
            <Select
              key={isEdit && locationDataReady ? `province-${provinceId}` : "province-initial"}
              value={provinceId && provinceId > 0 ? provinceId.toString() : ""}
              onValueChange={handleProvinceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("provincePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province.id} value={province.id.toString()}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.province_id && <FieldError>{errors.province_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("cityLabel")} *</FieldLabel>
            <Select
              key={isEdit && locationDataReady ? `city-${cityId}-${provinceId}` : "city-initial"}
              value={cityId && cityId > 0 ? cityId.toString() : ""}
              onValueChange={handleCityChange}
              disabled={!provinceId || provinceId === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={provinceId ? t("cityPlaceholder") : t("selectProvinceFirst")} />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((city) => (
                  <SelectItem key={city.id} value={city.id.toString()}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city_id && <FieldError>{errors.city_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("districtLabel")} *</FieldLabel>
            <Select
              key={isEdit && locationDataReady ? `district-${districtId}-${cityId}` : "district-initial"}
              value={districtId && districtId > 0 ? districtId.toString() : ""}
              onValueChange={handleDistrictChange}
              disabled={!cityId || cityId === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={cityId ? t("districtPlaceholder") : t("selectCityFirst")} />
              </SelectTrigger>
              <SelectContent>
                {availableDistricts.map((district) => (
                  <SelectItem key={district.id} value={district.id.toString()}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.district_id && <FieldError>{errors.district_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("villageLabel")} *</FieldLabel>
            <Select
              key={isEdit && locationDataReady ? `village-${villageId ?? 0}-${districtId}` : "village-initial"}
              value={villageId && villageId > 0 ? villageId.toString() : ""}
              onValueChange={(value) => setValue("village_id", parseInt(value), { shouldValidate: true })}
              disabled={!districtId || districtId === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={districtId ? t("villagePlaceholder") : t("selectDistrictFirst")} />
              </SelectTrigger>
              <SelectContent>
                {availableVillages.map((village) => (
                  <SelectItem key={village.id} value={village.id.toString()}>
                    {village.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.village_id && <FieldError>{errors.village_id.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Location Coordinates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center space-x-2">
            <Navigation className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("coordinates.title")}</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMapPickerOpen(true)}
            disabled={isLoading}
          >
            <MapPin className="h-3 w-3 mr-1" />
            {t("pickFromMap")}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("latitudeLabel")} *</FieldLabel>
            <Input
              type="number"
              step="any"
              {...register("latitude", { valueAsNumber: true })}
              placeholder={t("latitudePlaceholder")}
            />
            <FieldDescription>{t("latitudeDescription")}</FieldDescription>
            {errors.latitude && <FieldError>{errors.latitude.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("longitudeLabel")} *</FieldLabel>
            <Input
              type="number"
              step="any"
              {...register("longitude", { valueAsNumber: true })}
              placeholder={t("longitudePlaceholder")}
            />
            <FieldDescription>{t("longitudeDescription")}</FieldDescription>
            {errors.longitude && <FieldError>{errors.longitude.message}</FieldError>}
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("submitting")}
            </>
          ) : isEdit ? (
            t("submitUpdate")
          ) : (
            t("submitCreate")
          )}
        </Button>
      </div>

      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={latitude ?? -6.2088}
        longitude={longitude ?? 106.8456}
        onCoordinateSelect={handleMapCoordinateSelect}
        title={t("mapPicker.title")}
        description={t("mapPicker.description")}
      />
    </form>
  );
}
