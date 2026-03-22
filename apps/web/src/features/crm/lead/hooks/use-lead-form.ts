"use client";

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateLead, useUpdateLead } from "./use-leads";
import type { Lead } from "../types";
import { provinceService, cityService } from "@/features/master-data/geographic/services/geographic-service";
import type { ListCitiesParams } from "@/features/master-data/geographic/types";

export interface UseLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Lead | null;
  onSuccess?: () => void;
}

export function useLeadForm({ open, onOpenChange, editingItem, onSuccess }: UseLeadFormProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z.object({
        first_name: z
          .string()
          .min(1, t("validation.firstNameRequired"))
          .min(2, t("validation.firstNameMin"))
          .max(100, t("validation.firstNameMax")),
        last_name: z.string().max(100).optional().or(z.literal("")),
        company_name: z.string().max(200).optional().or(z.literal("")),
        email: z
          .string()
          .email(t("validation.emailInvalid"))
          .max(100)
          .optional()
          .or(z.literal("")),
        phone: z.string().max(30).optional().or(z.literal("")),
        contact_role_id: z.string().optional().or(z.literal("")),
        address: z.string().optional().or(z.literal("")),
        city: z.string().max(100).optional().or(z.literal("")),
        province: z.string().max(100).optional().or(z.literal("")),
        province_id: z.string().optional().or(z.literal("")),
        city_id: z.string().optional().or(z.literal("")),
        district_id: z.string().optional().or(z.literal("")),
        village_name: z.string().max(200).optional().or(z.literal("")),
        latitude: z.number().min(-90).max(90).optional().nullable(),
        longitude: z.number().min(-180).max(180).optional().nullable(),
        lead_source_id: z.string().optional().or(z.literal("")),
        lead_status_id: z.string().optional().or(z.literal("")),
        estimated_value: z.number().min(0).optional(),
        probability: z.number().min(0).max(100).optional(),
        budget_confirmed: z.boolean(),
        budget_amount: z.number().min(0).optional(),
        auth_confirmed: z.boolean(),
        auth_person: z.string().max(200).optional().or(z.literal("")),
        need_confirmed: z.boolean(),
        need_description: z.string().optional().or(z.literal("")),
        time_confirmed: z.boolean(),
        time_expected: z.string().optional().or(z.literal("")),
        assigned_to: z.string().optional().or(z.literal("")),
        notes: z.string().optional().or(z.literal("")),
        website: z.string().optional().or(z.literal("")),
        business_type_id: z.string().optional().or(z.literal("")),
        area_id: z.string().optional().or(z.literal("")),
        payment_terms_id: z.string().optional().or(z.literal("")),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  type LeadFormValues = z.infer<typeof schema>;

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  const initialDefaultValues: LeadFormValues = editingItem
    ? {
        first_name: editingItem.first_name,
        last_name: editingItem.last_name ?? "",
        company_name: editingItem.company_name ?? "",
        email: editingItem.email ?? "",
        phone: editingItem.phone ?? "",
        contact_role_id: editingItem.contact_role_id ?? "",
        address: editingItem.address ?? "",
        city: editingItem.city ?? "",
        province: editingItem.province ?? "",
        province_id: editingItem.province_id ?? "",
        city_id: editingItem.city_id ?? "",
        district_id: editingItem.district_id ?? "",
        village_name: editingItem.village_name ?? "",
        latitude: editingItem.latitude ?? null,
        longitude: editingItem.longitude ?? null,
        lead_source_id: editingItem.lead_source_id ?? "",
        lead_status_id: editingItem.lead_status_id ?? "",
        estimated_value: editingItem.estimated_value ?? 0,
        probability: editingItem.probability ?? 0,
        budget_confirmed: editingItem.budget_confirmed ?? false,
        budget_amount: editingItem.budget_amount ?? 0,
        auth_confirmed: editingItem.auth_confirmed ?? false,
        auth_person: editingItem.auth_person ?? "",
        need_confirmed: editingItem.need_confirmed ?? false,
        need_description: editingItem.need_description ?? "",
        time_confirmed: editingItem.time_confirmed ?? false,
        time_expected: editingItem.time_expected ?? "",
        assigned_to: editingItem.assigned_to ?? "",
        notes: editingItem.notes ?? "",
        website: editingItem.website ?? "",
        business_type_id: editingItem.business_type_id ?? "",
        area_id: editingItem.area_id ?? "",
        payment_terms_id: editingItem.payment_terms_id ?? "",
      }
    : {
        first_name: "",
        last_name: "",
        company_name: "",
        email: "",
        phone: "",
        contact_role_id: "",
        address: "",
        city: "",
        province: "",
        province_id: "",
        city_id: "",
        district_id: "",
        village_name: "",
        latitude: null,
        longitude: null,
        lead_source_id: "",
        lead_status_id: "",
        estimated_value: 0,
        probability: 0,
        budget_confirmed: false,
        budget_amount: 0,
        auth_confirmed: false,
        auth_person: "",
        need_confirmed: false,
        need_description: "",
        time_confirmed: false,
        time_expected: "",
        assigned_to: "",
        notes: "",
        website: "",
        business_type_id: "",
        area_id: "",
        payment_terms_id: "",
      };

  // (debug logs removed)

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialDefaultValues,
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          first_name: editingItem.first_name,
          last_name: editingItem.last_name ?? "",
          company_name: editingItem.company_name ?? "",
          email: editingItem.email ?? "",
          phone: editingItem.phone ?? "",
          contact_role_id: editingItem.contact_role_id ?? "",
          address: editingItem.address ?? "",
          city: editingItem.city ?? "",
          province: editingItem.province ?? "",
          province_id: editingItem.province_id ?? "",
          city_id: editingItem.city_id ?? "",
          district_id: editingItem.district_id ?? "",
          village_name: editingItem.village_name ?? "",
          latitude: editingItem.latitude ?? null,
          longitude: editingItem.longitude ?? null,
          lead_source_id: editingItem.lead_source_id ?? "",
          lead_status_id: editingItem.lead_status_id ?? "",
          estimated_value: editingItem.estimated_value ?? 0,
          probability: editingItem.probability ?? 0,
          budget_confirmed: editingItem.budget_confirmed ?? false,
          budget_amount: editingItem.budget_amount ?? 0,
          auth_confirmed: editingItem.auth_confirmed ?? false,
          auth_person: editingItem.auth_person ?? "",
          need_confirmed: editingItem.need_confirmed ?? false,
          need_description: editingItem.need_description ?? "",
          time_confirmed: editingItem.time_confirmed ?? false,
          time_expected: editingItem.time_expected ?? "",
          assigned_to: editingItem.assigned_to ?? "",
          notes: editingItem.notes ?? "",
          website: editingItem.website ?? "",
          business_type_id: editingItem.business_type_id ?? "",
          area_id: editingItem.area_id ?? "",
          payment_terms_id: editingItem.payment_terms_id ?? "",
        });
        

        // If the editing item contains location names but missing IDs, try to resolve them
        (async () => {
          try {
            const values = form.getValues();
            // Resolve province_id from province name
            if (!values.province_id && values.province) {
              const provRes = await provinceService.list({ per_page: 10, search: values.province });
              const match = provRes.data.find((p) => p.name?.toLowerCase() === values.province?.toLowerCase()) || provRes.data[0];
              if (match) {
                form.setValue("province_id", match.id, { shouldDirty: true });
              }
            }

            // Resolve city_id from city name (prefer searching within resolved province)
            const afterProv = form.getValues();
            if (!afterProv.city_id && afterProv.city) {
              const cityParams: Partial<ListCitiesParams> = { per_page: 10, search: afterProv.city };
              if (afterProv.province_id) cityParams.province_id = afterProv.province_id;
              const cityRes = await cityService.list(cityParams);
              const matchCity = cityRes.data.find((c) => c.name?.toLowerCase() === afterProv.city?.toLowerCase()) || cityRes.data[0];
              if (matchCity) {
                form.setValue("city_id", matchCity.id, { shouldDirty: true });
              }
            }

            // Resolve district_id from district name if provided
            const afterCity = form.getValues();
            if (!afterCity.district_id && afterCity.city_id && editingItem.district_id === "") {
              // If original editingItem had empty district_id but district name exists, attempt resolve
              // (editingItem may not include district name; skip unless necessary)
            }
          } catch (err) {
            // swallow resolution errors silently (no-op)
          }
        })();
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          company_name: "",
          email: "",
          phone: "",
          contact_role_id: "",
          address: "",
          city: "",
          province: "",
          province_id: "",
          city_id: "",
          district_id: "",
          village_name: "",
          latitude: null,
          longitude: null,
          lead_source_id: "",
          lead_status_id: "",
          estimated_value: 0,
          probability: 0,
          budget_confirmed: false,
          budget_amount: 0,
          auth_confirmed: false,
          auth_person: "",
          need_confirmed: false,
          need_description: "",
          time_confirmed: false,
          time_expected: "",
          assigned_to: "",
          notes: "",
          website: "",
          business_type_id: "",
          area_id: "",
          payment_terms_id: "",
        });
        
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<LeadFormValues> = async (data) => {
    try {
      const payload = {
        ...data,
        lead_source_id: data.lead_source_id || null,
        lead_status_id: data.lead_status_id || null,
        assigned_to: data.assigned_to || null,
        time_expected: data.time_expected || null,
        last_name: data.last_name || undefined,
        company_name: data.company_name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        contact_role_id: data.contact_role_id || null,
        address: data.address || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        province_id: data.province_id || null,
        city_id: data.city_id || null,
        district_id: data.district_id || null,
        village_name: data.village_name || undefined,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        auth_person: data.auth_person || undefined,
        need_description: data.need_description || undefined,
        notes: data.notes || undefined,
        website: data.website || undefined,
        business_type_id: data.business_type_id || null,
        area_id: data.area_id || null,
        payment_terms_id: data.payment_terms_id || null,
      };

      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(payload as Parameters<typeof createMutation.mutateAsync>[0]);
        toast.success(t("created"));
      }
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const onInvalid = () => {
    toast.error(tCommon("validationError"));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit, onInvalid),
    isSubmitting,
    isEditing: !!editingItem,
    schema,
  };
}
