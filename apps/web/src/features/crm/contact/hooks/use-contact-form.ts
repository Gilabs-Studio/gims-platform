"use client";

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateContact, useUpdateContact } from "./use-contact";
import type { Contact } from "../types";

export interface UseContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Contact | null;
  customerId?: string;
  initialName?: string;
  onSaved?: (contact: Contact) => void;
}

export function useContactForm({
  open,
  onOpenChange,
  editingItem,
  customerId,
  initialName,
  onSaved,
}: UseContactFormProps) {
  const t = useTranslations("crmContact");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z.object({
        customer_id: z.string().min(1),
        contact_role_id: z.string().optional().or(z.literal("")),
        name: z
          .string()
          .min(1, t("validation.nameRequired"))
          .min(2, t("validation.nameMin"))
          .max(200, t("validation.nameMax")),
        phone: z.string().max(30).optional().or(z.literal("")),
        email: z
          .string()
          .email(t("validation.emailInvalid"))
          .max(100, t("validation.emailMax"))
          .optional()
          .or(z.literal("")),
        notes: z.string().max(1000).optional().or(z.literal("")),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: customerId ?? "",
      contact_role_id: "",
      name: initialName ?? "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          customer_id: editingItem.customer_id,
          contact_role_id: editingItem.contact_role_id ?? "",
          name: editingItem.name,
          phone: editingItem.phone ?? "",
          email: editingItem.email ?? "",
          notes: editingItem.notes ?? "",
        });
      } else {
        form.reset({
          customer_id: customerId ?? "",
          contact_role_id: "",
          name: initialName ?? "",
          phone: "",
          email: "",
          notes: "",
        });
      }
    }
  }, [editingItem, form, open, customerId, initialName]);

  const onSubmit: SubmitHandler<z.infer<typeof schema>> = async (data) => {
    try {
      const payload = {
        ...data,
        contact_role_id: data.contact_role_id || null,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
        is_active: true,
      };

      if (editingItem) {
        const response = await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        if (response.data) {
          onSaved?.(response.data);
        }
        toast.success(t("updated"));
      } else {
        const response = await createMutation.mutateAsync(
          payload as Parameters<typeof createMutation.mutateAsync>[0],
        );
        if (response.data) {
          onSaved?.(response.data);
        }
        toast.success(t("created"));
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isEditing: !!editingItem,
    t,
    tCommon,
  };
}
