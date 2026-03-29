"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateCompany, useUpdateCompany, useCompany } from "./use-companies";
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

  const isActive = useWatch({ control, name: "is_active" });

  // Single effect: fetch first, then reset — eliminates race condition on re-open
  useEffect(() => {
    if (!isOpen) return;

    if ((mode === "edit" || mode === "view") && company?.id) {
      void refetchDetail().then((result) => {
        const entity =
          result.status === "success" && result.data?.data
            ? result.data.data
            : company;
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
  }, [company, company?.id, isOpen, mode, refetchDetail, reset]);

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
        is_active: true,
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

  const isLoading = createCompany.isPending || updateCompany.isPending || isLoadingDetail;

  const panelTitle = isViewing
    ? fullCompany?.name ?? t("company.title")
    : isEditing
      ? t("company.editTitle")
      : t("company.createTitle");

  return {
    state: {
      isActive,
      isLoading,
      panelTitle,
      isViewing,
      isEditing,
    },
    actions: {
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
    translations: {
      t,
    },
  };
}
