"use client";

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateTask, useUpdateTask } from "./use-tasks";
import type { Task } from "../types";

export interface UseTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Task | null;
  onSuccess?: () => void;
}

export function useTaskForm({ open, onOpenChange, editingItem, onSuccess }: UseTaskFormProps) {
  const t = useTranslations("crmTask");
  const tCommon = useTranslations("common");
  const isEditing = !!editingItem;

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("validation.titleRequired")).max(255),
        description: z.string().optional().or(z.literal("")),
        type: z.enum(["general", "call", "email", "meeting", "follow_up"], {
          message: t("validation.typeRequired"),
        }),
        priority: z.enum(["low", "medium", "high", "urgent"], {
          message: t("validation.priorityRequired"),
        }),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        due_date: z.string().optional().or(z.literal("")),
        assigned_to: z.string().optional().or(z.literal("")),
        assigned_from: z.string().optional().or(z.literal("")),
        customer_id: z.string().optional().or(z.literal("")),
        contact_id: z.string().optional().or(z.literal("")),
        deal_id: z.string().optional().or(z.literal("")),
        lead_id: z.string().optional().or(z.literal("")),
      }),
    [t]
  );

  type TaskFormValues = z.infer<typeof schema>;

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "general",
      priority: "medium",
      status: "pending",
      due_date: "",
      assigned_to: "",
      assigned_from: "",
      customer_id: "",
      contact_id: "",
      deal_id: "",
      lead_id: "",
    },
  });

  useEffect(() => {
    if (open && editingItem) {
      form.reset({
        title: editingItem.title,
        description: editingItem.description ?? "",
        type: editingItem.type,
        priority: editingItem.priority,
        status: editingItem.status,
        due_date: editingItem.due_date?.slice(0, 16) ?? "",
        assigned_to: editingItem.assigned_to_employee?.id ?? "",
        assigned_from: editingItem.assigned_from_employee?.id ?? "",
        customer_id: editingItem.customer?.id ?? "",
        contact_id: editingItem.contact?.id ?? "",
        deal_id: editingItem.deal?.id ?? "",
        lead_id: editingItem.lead?.id ?? "",
      });
    } else if (open) {
      form.reset();
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<TaskFormValues> = async (data) => {
    try {
      const payload = {
        ...data,
        description: data.description || undefined,
        due_date: data.due_date || null,
        assigned_to: data.assigned_to || null,
        assigned_from: data.assigned_from || null,
        customer_id: data.customer_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
        lead_id: data.lead_id || null,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("created"));
      }
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isEditing,
  };
}
