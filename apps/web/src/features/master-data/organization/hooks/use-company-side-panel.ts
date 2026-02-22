"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateCompany, useUpdateCompany } from "./use-companies";
import { useProvinces } from "../../geographic/hooks/use-provinces";
import { useCities } from "../../geographic/hooks/use-cities";
import { useDistricts } from "../../geographic/hooks/use-districts";
import { useVillages } from "../../geographic/hooks/use-villages";
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
    setValue("latitude", lat, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue("longitude", lng, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
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

  const panelTitle = isViewing
    ? company?.name ?? t("company.title")
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
      villages,
    },
    translations: {
      t,
    },
  };
}
