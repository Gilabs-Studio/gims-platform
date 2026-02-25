"use client";

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateSchedule, useUpdateSchedule } from "./use-schedules";
import type { Schedule } from "../types";

export interface UseScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Schedule | null;
  onSuccess?: () => void;
}

export function useScheduleForm({ open, onOpenChange, editingItem, onSuccess }: UseScheduleFormProps) {
  const t = useTranslations("crmSchedule");
  const tCommon = useTranslations("common");
  const isEditing = !!editingItem;

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("validation.titleRequired")).max(255),
        description: z.string().optional().or(z.literal("")),
        task_id: z.string().optional().or(z.literal("")),
        employee_id: z.string().min(1, t("validation.employeeRequired")),
        scheduled_at: z.string().min(1, t("validation.scheduledAtRequired")),
        end_at: z.string().optional().or(z.literal("")),
        location: z.string().optional().or(z.literal("")),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
        reminder_minutes_before: z.number().min(0),
      }),
    [t]
  );

  type ScheduleFormValues = z.infer<typeof schema>;

  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      task_id: "",
      employee_id: "",
      scheduled_at: "",
      end_at: "",
      location: "",
      status: "pending",
      reminder_minutes_before: 30,
    },
  });

  useEffect(() => {
    if (open && editingItem) {
      form.reset({
        title: editingItem.title,
        description: editingItem.description ?? "",
        task_id: editingItem.task_id ?? "",
        employee_id: editingItem.employee_id,
        scheduled_at: editingItem.scheduled_at?.slice(0, 16) ?? "",
        end_at: editingItem.end_at?.slice(0, 16) ?? "",
        location: editingItem.location ?? "",
        status: editingItem.status,
        reminder_minutes_before: editingItem.reminder_minutes_before,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<ScheduleFormValues> = async (data) => {
    try {
      const payload = {
        ...data,
        description: data.description || undefined,
        task_id: data.task_id || null,
        end_at: data.end_at || null,
        location: data.location || undefined,
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
