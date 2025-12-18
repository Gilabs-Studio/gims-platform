"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Building, Phone, MapPin, Navigation, Loader2 } from "lucide-react";
import {
  createCompanySchema,
  updateCompanySchema,
  type CreateCompanyFormData,
  type UpdateCompanyFormData,
} from "../schemas/company.schema";
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
import { useCompanyAddData } from "../hooks/use-companies";
import type { Company } from "../types";
import { useState, useMemo, useEffect, useCallback } from "react";

interface CompanyFormProps {
  readonly company?: Company;
  readonly onSubmit: (data: CreateCompanyFormData | UpdateCompanyFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function CompanyForm({ company, onSubmit, onCancel, isLoading }: CompanyFormProps) {
  const isEdit = !!company;
  const { data: addData, isLoading: isLoadingAddData } = useCompanyAddData();
  const t = useTranslations("companyManagement.form");
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [locationDataReady, setLocationDataReady] = useState(false);

  const provinces = useMemo(() => addData?.data?.provinces || [], [addData?.data?.provinces]);
  const directors = useMemo(() => addData?.data?.directors || [], [addData?.data?.directors]);

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
  } = useForm<CreateCompanyFormData | UpdateCompanyFormData>({
    resolver: zodResolver(isEdit ? updateCompanySchema : createCompanySchema),
    defaultValues: company
        ? (() => {
          // For edit mode, set basic values first
          // Location IDs will be set in useEffect after addData is available
          const districtId = company.village?.district_id || 0;

          // Only calculate location IDs if addData is already available
          const { provinceId, cityId } = addData?.data?.provinces?.length
            ? findLocationIds(districtId)
            : { provinceId: 0, cityId: 0 };

          return {
            province_id: provinceId,
            city_id: cityId,
            district_id: districtId,
            village_id: company.village?.id || 0,
            director_id: company.director?.id || 0,
            name: company.name,
            address: company.address,
            npwp: company.npwp || "",
            nib: company.nib || "",
            telp: company.telp,
            email: company.email,
            latitude: company.latitude,
            longitude: company.longitude,
          };
        })()
      : {
          province_id: 0,
          city_id: 0,
          district_id: 0,
          village_id: 0,
          director_id: 0,
          name: "",
          address: "",
          npwp: "",
          nib: "",
          telp: "",
          email: "",
          latitude: -6.2088, // Jakarta default
          longitude: 106.8456, // Jakarta default
        },
  });

  // Reset locationDataReady flag when company changes
  useEffect(() => {
    if (isEdit && company) {
      setLocationDataReady(false);
    }
  }, [company, isEdit]);

  // Update form when company and addData are available (for edit mode)
  useEffect(() => {
    if (isEdit && company && addData?.data?.provinces?.length && !locationDataReady) {
      const districtId = company.village?.district_id || 0;
      const { provinceId, cityId } = findLocationIds(districtId);

      reset(
        {
          province_id: provinceId,
          city_id: cityId,
          district_id: districtId,
          village_id: company.village?.id || 0,
          director_id: company.director?.id || 0,
          name: company.name,
          address: company.address,
          npwp: company.npwp || "",
          nib: company.nib || "",
          telp: company.telp,
          email: company.email,
          latitude: company.latitude,
          longitude: company.longitude,
        },
        { keepDefaultValues: false },
      );

      // Mark location data as ready to trigger Select re-render
      setLocationDataReady(true);
    } else if (isEdit && company && !addData?.data?.provinces?.length) {
      // Reset flag when addData is not ready
      setLocationDataReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, isEdit, addData?.data?.provinces?.length, reset, isLoadingAddData, findLocationIds]);

  // Watch form values
  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const villageId = watch("village_id");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  // Get available cities based on selected province
  const availableCities = useMemo(() => {
    if (!provinces || !provinceId) return [];
    const province = provinces.find((p) => p.id === provinceId);
    return province?.cities || [];
  }, [provinces, provinceId]);

  // Get available districts based on selected city
  const availableDistricts = useMemo(() => {
    if (!availableCities || !cityId) return [];
    const city = availableCities.find((c) => c.id === cityId);
    return city?.districts || [];
  }, [availableCities, cityId]);

  // Get available villages based on selected district
  const availableVillages = useMemo(() => {
    if (!availableDistricts || !districtId) return [];
    const district = availableDistricts.find((d) => d.id === districtId);
    return district?.villages || [];
  }, [availableDistricts, districtId]);

  const handleFormSubmit = async (data: CreateCompanyFormData | UpdateCompanyFormData) => {
    await onSubmit(data);
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
          <Building className="h-4 w-4 text-primary" />
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
            <FieldLabel>{t("directorLabel")} *</FieldLabel>
            <Select
              value={watch("director_id")?.toString() || ""}
              onValueChange={(value) => setValue("director_id", parseInt(value), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("directorPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {directors.map((director) => (
                  <SelectItem key={director.id} value={director.id.toString()}>
                    {director.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.director_id && <FieldError>{errors.director_id.message}</FieldError>}
          </Field>
        </div>
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
            <FieldLabel>{t("telpLabel")} *</FieldLabel>
            <Input {...register("telp")} placeholder={t("telpPlaceholder")} />
            <FieldDescription>{t("telpDescription")}</FieldDescription>
            {errors.telp && <FieldError>{errors.telp.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("emailLabel")} *</FieldLabel>
            <Input type="email" {...register("email")} placeholder={t("emailPlaceholder")} />
            <FieldDescription>{t("emailDescription")}</FieldDescription>
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>NPWP</FieldLabel>
            <Input {...register("npwp")} placeholder={t("npwpPlaceholder")} />
            <FieldDescription>{t("npwpDescription")}</FieldDescription>
            {errors.npwp && <FieldError>{errors.npwp.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>NIB</FieldLabel>
            <Input {...register("nib")} placeholder={t("nibPlaceholder")} />
            <FieldDescription>{t("nibDescription")}</FieldDescription>
            {errors.nib && <FieldError>{errors.nib.message}</FieldError>}
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
