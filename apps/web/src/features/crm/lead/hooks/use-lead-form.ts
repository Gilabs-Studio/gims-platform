"use client";

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateLead, useUpdateLead } from "./use-leads";
import type { Lead } from "../types";

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
        job_title: z.string().max(100).optional().or(z.literal("")),
        address: z.string().optional().or(z.literal("")),
        city: z.string().max(100).optional().or(z.literal("")),
        province: z.string().max(100).optional().or(z.literal("")),
        lead_source_id: z.string().uuid().optional().or(z.literal("")),
        lead_status_id: z.string().uuid().optional().or(z.literal("")),
        estimated_value: z.number().min(0),
        probability: z.number().min(0).max(100),
        budget_confirmed: z.boolean(),
        budget_amount: z.number().min(0),
        auth_confirmed: z.boolean(),
        auth_person: z.string().max(200).optional().or(z.literal("")),
        need_confirmed: z.boolean(),
        need_description: z.string().optional().or(z.literal("")),
        time_confirmed: z.boolean(),
        time_expected: z.string().optional().or(z.literal("")),
        assigned_to: z.string().uuid().optional().or(z.literal("")),
        notes: z.string().optional().or(z.literal("")),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  type LeadFormValues = z.infer<typeof schema>;

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      company_name: "",
      email: "",
      phone: "",
      job_title: "",
      address: "",
      city: "",
      province: "",
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
    },
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
          job_title: editingItem.job_title ?? "",
          address: editingItem.address ?? "",
          city: editingItem.city ?? "",
          province: editingItem.province ?? "",
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
        });
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          company_name: "",
          email: "",
          phone: "",
          job_title: "",
          address: "",
          city: "",
          province: "",
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
        job_title: data.job_title || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        auth_person: data.auth_person || undefined,
        need_description: data.need_description || undefined,
        notes: data.notes || undefined,
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting,
    isEditing: !!editingItem,
    schema,
  };
}
