"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useCreateCustomer, useUpdateCustomer, useCustomerFormData, useCustomer } from "./use-customers";
import { useProvinces } from "../../geographic/hooks/use-provinces";
import { useCities } from "../../geographic/hooks/use-cities";
import { useDistricts } from "../../geographic/hooks/use-districts";
import { useVillages } from "../../geographic/hooks/use-villages";
import { getCustomerSchema, type CustomerFormData } from "../schemas/customer.schema";
import type { Customer } from "../types";

export type PanelMode = "create" | "edit" | "view";

export interface CustomerSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly customer?: Customer | null;
  readonly onSuccess?: () => void;
}

export function useCustomerSidePanel(props: CustomerSidePanelProps) {
  const { isOpen, onClose, mode, customer, onSuccess } = props;
  const t = useTranslations("customer");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  
  const { data: detailRes, isLoading: isLoadingDetail } = useCustomer(customer?.id ?? "");
  const fullCustomer = detailRes?.data ?? customer;

  const { data: formDataRes } = useCustomerFormData();
  const customerTypes = formDataRes?.data?.customer_types ?? [];
  const businessTypes = formDataRes?.data?.business_types ?? [];
  const areas = formDataRes?.data?.areas ?? [];
  const salesReps = formDataRes?.data?.sales_reps ?? [];
  const paymentTermsList = formDataRes?.data?.payment_terms ?? [];

  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(getCustomerSchema(t)) as unknown as Resolver<CustomerFormData>,
    defaultValues: {
      code: "",
      name: "",
      customer_type_id: "",
      address: "",
      email: "",
      website: "",
      npwp: "",
      contact_person: "",
      notes: "",
      village_id: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      latitude: -6.2088,
      longitude: 106.8456,
      is_active: true,
      default_business_type_id: "",
      default_area_id: "",
      default_sales_rep_id: "",
      default_payment_terms_id: "",
      default_tax_rate: null,
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
    if (fullCustomer && (mode === "edit" || mode === "view")) {
      const v = fullCustomer.village;
      const d = v?.district;
      const c = d?.city;
      const p = c?.province;

      reset({
        code: fullCustomer.code,
        name: fullCustomer.name,
        customer_type_id: fullCustomer.customer_type_id ?? "",
        address: fullCustomer.address ?? "",
        email: fullCustomer.email ?? "",
        website: fullCustomer.website ?? "",
        npwp: fullCustomer.npwp ?? "",
        contact_person: fullCustomer.contact_person ?? "",
        notes: fullCustomer.notes ?? "",
        village_id: fullCustomer.village_id ?? "",
        province_id: p?.id,
        city_id: c?.id,
        district_id: d?.id,
        latitude: fullCustomer.latitude ?? -6.2088,
        longitude: fullCustomer.longitude ?? 106.8456,
        is_active: fullCustomer.is_active,
        default_business_type_id: fullCustomer.default_business_type_id ?? "",
        default_area_id: fullCustomer.default_area_id ?? "",
        default_sales_rep_id: fullCustomer.default_sales_rep_id ?? "",
        default_payment_terms_id: fullCustomer.default_payment_terms_id ?? "",
        default_tax_rate: fullCustomer.default_tax_rate ?? null,
      });
    } else if (mode === "create") {
      reset({
        code: "",
        name: "",
        customer_type_id: "",
        address: "",
        email: "",
        website: "",
        npwp: "",
        contact_person: "",
        notes: "",
        village_id: "",
        latitude: -6.2088,
        longitude: 106.8456,
        is_active: true,
        default_business_type_id: "",
        default_area_id: "",
        default_sales_rep_id: "",
        default_payment_terms_id: "",
        default_tax_rate: null,
      });
    }
  }, [customer, mode, reset, isOpen]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const payload = {
        code: data.code || undefined,
        name: data.name,
        customer_type_id: data.customer_type_id || undefined,
        address: data.address || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        npwp: data.npwp || undefined,
        contact_person: data.contact_person || undefined,
        notes: data.notes || undefined,
        village_id: data.village_id || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active,
        default_business_type_id: data.default_business_type_id || undefined,
        default_area_id: data.default_area_id || undefined,
        default_sales_rep_id: data.default_sales_rep_id || undefined,
        default_payment_terms_id: data.default_payment_terms_id || undefined,
        default_tax_rate: data.default_tax_rate ?? undefined,
      };

      if (isEditing && fullCustomer) {
        await updateCustomer.mutateAsync({ id: fullCustomer.id, data: payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to save customer:", error);
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

  const isLoading = createCustomer.isPending || updateCustomer.isPending || isLoadingDetail;

  const panelTitle = isViewing
    ? fullCustomer?.name ?? t("customer.title")
    : isEditing
      ? t("customer.editTitle")
      : t("customer.createTitle");

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
      customerTypes,
      businessTypes,
      areas,
      salesReps,
      paymentTermsList,
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
