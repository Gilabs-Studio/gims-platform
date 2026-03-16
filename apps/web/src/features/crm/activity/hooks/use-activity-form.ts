"use client";

import { useMemo, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateActivity } from "./use-activities";

export interface UseActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultLeadId?: string;
  defaultDealId?: string;
}

export function useActivityForm({ open, onOpenChange, onSuccess, defaultLeadId, defaultDealId }: UseActivityFormProps) {
  const t = useTranslations("crmActivity");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z.object({
        type: z.enum(["visit", "call", "email", "meeting", "follow_up", "task", "deal", "lead"], {
          message: t("validation.typeRequired"),
        }),
        activity_type_id: z.string().uuid().optional().or(z.literal("")),
        customer_id: z.string().uuid().optional().or(z.literal("")),
        contact_id: z.string().uuid().optional().or(z.literal("")),
        deal_id: z.string().uuid().optional().or(z.literal("")),
        lead_id: z.string().uuid().optional().or(z.literal("")),
        employee_id: z.string().min(1, t("validation.employeeRequired")),
        description: z.string().min(1, t("validation.descriptionRequired")),
        timestamp: z.string().optional().or(z.literal("")),
      }),
    [t]
  );

  type ActivityFormValues = z.infer<typeof schema>;

  const createMutation = useCreateActivity();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "call",
      activity_type_id: "",
      customer_id: "",
      contact_id: "",
      deal_id: defaultDealId || "",
      lead_id: defaultLeadId || "",
      employee_id: "",
      description: "",
      timestamp: "",
    },
  });

  // Re-populate contextual IDs whenever the dialog opens (handles subsequent opens)
  useEffect(() => {
    if (open) {
      form.reset({
        type: "call",
        activity_type_id: "",
        customer_id: "",
        contact_id: "",
        deal_id: defaultDealId || "",
        lead_id: defaultLeadId || "",
        employee_id: "",
        description: "",
        timestamp: "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit: SubmitHandler<ActivityFormValues> = async (data) => {
    try {
      const payload = {
        ...data,
        activity_type_id: data.activity_type_id || null,
        customer_id: data.customer_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
        lead_id: data.lead_id || null,
        timestamp: data.timestamp || null,
      };
      await createMutation.mutateAsync(payload);
      toast.success(t("created"));
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return { form, onSubmit: form.handleSubmit(onSubmit), isSubmitting: createMutation.isPending, schema };
}
