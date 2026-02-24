"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateContact, useUpdateContact } from "./use-contact";
import type { Contact } from "../types";

const schema = z.object({
  customer_id: z.string().uuid(),
  contact_role_id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(200),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().max(100).optional().or(z.literal("")),
  position: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export interface UseContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Contact | null;
  customerId?: string;
}

export function useContactForm({ open, onOpenChange, editingItem, customerId }: UseContactFormProps) {
  const t = useTranslations("crmContact");
  const tCommon = useTranslations("common");

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: customerId ?? "",
      contact_role_id: "",
      name: "",
      phone: "",
      email: "",
      position: "",
      notes: "",
      is_active: true,
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
          position: editingItem.position ?? "",
          notes: editingItem.notes ?? "",
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          customer_id: customerId ?? "",
          contact_role_id: "",
          name: "",
          phone: "",
          email: "",
          position: "",
          notes: "",
          is_active: true,
        });
      }
    }
  }, [editingItem, form, open, customerId]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const payload = {
        ...data,
        contact_role_id: data.contact_role_id || null,
        phone: data.phone || undefined,
        email: data.email || undefined,
        position: data.position || undefined,
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
