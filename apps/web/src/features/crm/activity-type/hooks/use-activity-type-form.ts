import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateActivityType, useUpdateActivityType } from "./use-activity-type";
import type { ActivityType } from "../types";

const schema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  badge_color: z.string().max(20).optional(),
  order: z.number().min(0),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export interface UseActivityTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: ActivityType | null;
}

export function useActivityTypeForm({ open, onOpenChange, editingItem }: UseActivityTypeFormProps) {
  const t = useTranslations("activityType");
  const tCommon = useTranslations("common");

  const createMutation = useCreateActivityType();
  const updateMutation = useUpdateActivityType();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", description: "", icon: "", badge_color: "#3B82F6", order: 0, is_active: true },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          code: editingItem.code,
          description: editingItem.description ?? "",
          icon: editingItem.icon ?? "",
          badge_color: editingItem.badge_color ?? "#3B82F6",
          order: editingItem.order,
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({ name: "", code: "", description: "", icon: "", badge_color: "#3B82F6", order: 0, is_active: true });
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created"));
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return { form, t, tCommon, isLoading, onSubmit: form.handleSubmit(onSubmit) };
}
