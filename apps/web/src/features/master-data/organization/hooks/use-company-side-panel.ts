"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateCompany, useUpdateCompany, useCompany } from "./use-companies";
import { useProvinces } from "../../geographic/hooks/use-provinces";
import { useCities } from "../../geographic/hooks/use-cities";
import { useDistricts } from "../../geographic/hooks/use-districts";
import { getCompanySchema, type CompanyFormData } from "../schemas/organization.schema";
import type { Company } from "../types";

export type PanelMode = "create" | "edit" | "view";

export interface CompanySidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly company?: Company | null;
  readonly onSuccess?: () => void;
}

export function useCompanySidePanel(props: CompanySidePanelProps) {
  const { isOpen, onClose, mode, company, onSuccess } = props;
  const t = useTranslations("organization");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";
  
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const { data: detailRes, isLoading: isLoadingDetail, refetch: refetchDetail } = useCompany(
    company?.id ?? "",
    { enabled: false, staleTime: 0 }
  );
  const fullCompany = detailRes?.data ?? company;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
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
      village_name: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      director_id: "",
      latitude: null,
      longitude: null,
      is_active: true,
    },
  });

  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const isActive = watch("is_active");

  const { data: provincesData } = useProvinces({ per_page: 100 }, { enabled: isOpen });
  const { data: citiesData } = useCities(
    { province_id: String(provinceId), per_page: 100 },
    { enabled: isOpen && !!provinceId }
  );
  const { data: districtsData } = useDistricts(
    { city_id: String(cityId), per_page: 100 },
    { enabled: isOpen && !!cityId }
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];

  // Single effect: fetch first, then reset — eliminates race condition on re-open
  useEffect(() => {
    if (!isOpen) return;

    if ((mode === "edit" || mode === "view") && company?.id) {
      void refetchDetail().then((result) => {
        const entity = result.status === "success" && result.data?.data
          ? (result.data.data as any) // Cast to any to access new fields
          : (company as any);
        if (!entity) return;
        
        reset({
          name: entity.name,
          address: entity.address ?? "",
          email: entity.email ?? "",
          phone: entity.phone ?? "",
          npwp: entity.npwp ?? "",
          nib: entity.nib ?? "",
          village_name: entity.village_name ?? "",
          // Prefer direct IDs from API, fallback to nested village relation
          province_id: entity.province_id ?? entity.village?.district?.city?.province?.id,
          city_id: entity.city_id ?? entity.village?.district?.city?.id,
          district_id: entity.district_id ?? entity.village?.district?.id,
          director_id: entity.director_id ?? "",
          latitude: entity.latitude ?? null,
          longitude: entity.longitude ?? null,
          is_active: entity.is_active,
        });
      });
    } else if (mode === "create") {
      reset({
        name: "",
        address: "",
        email: "",
        phone: "",
        npwp: "",
        nib: "",
        village_name: "",
        province_id: undefined,
        city_id: undefined,
        district_id: undefined,
        director_id: "",
        latitude: null,
        longitude: null,
        is_active: true,
      });
    }
  }, [isOpen, mode, company?.id, refetchDetail, reset]);

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const payload = {
        name: data.name,
        address: data.address || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        npwp: data.npwp || undefined,
        nib: data.nib || undefined,
        // Send all resolved location IDs so backend persists them directly
        province_id: (data.province_id as string) || null,
        city_id: (data.city_id as string) || null,
        district_id: (data.district_id as string) || null,
        village_name: data.village_name || undefined,
        director_id: data.director_id || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        is_active: data.is_active,
      };

      if (isEditing && fullCompany) {
        await updateCompany.mutateAsync({ id: fullCompany.id, data: payload });
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
    setValue("latitude", lat, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue("longitude", lng, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleProvinceChange = (val: string) => {
    setValue("province_id", val);
    setValue("city_id", undefined);
    setValue("district_id", undefined);
  };

  const handleCityChange = (val: string) => {
    setValue("city_id", val);
    setValue("district_id", undefined);
  };

  const handleDistrictChange = (val: string) => {
    setValue("district_id", val);
  };

  const isLoading = createCompany.isPending || updateCompany.isPending || isLoadingDetail;

  const panelTitle = isViewing
    ? fullCompany?.name ?? t("company.title")
    : isEditing
      ? t("company.editTitle")
      : t("company.createTitle");

  return {
    state: {
      isMapPickerOpen,
      provinceId,
      cityId,
      districtId,
      latitude,
      longitude,
      isActive,
      isLoading,
      panelTitle,
      isViewing,
      isEditing,
    },
    actions: {
      setIsMapPickerOpen,
      handleCoordinateSelect,
      handleProvinceChange,
      handleCityChange,
      handleDistrictChange,
      setValue,
      onSubmit,
    },
    form: {
      register,
      handleSubmit,
      control,
      errors,
      watch,
    },
    data: {
      provinces,
      cities,
      districts,
    },
    translations: {
      t,
    },
  };
}
