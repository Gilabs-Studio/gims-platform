import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateLeaveType, useUpdateLeaveType } from "./use-leave-type";
import type { LeaveType } from "../types";

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  max_days: z.number().min(0),
  is_paid: z.boolean(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export interface UseLeaveTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: LeaveType | null;
}

export function useLeaveTypeForm({ open, onOpenChange, editingItem }: UseLeaveTypeFormProps) {
  const t = useTranslations("leaveType");
  const tCommon = useTranslations("common");
  
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", max_days: 0, is_paid: true, is_active: true },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description ?? "",
          max_days: editingItem.max_days,
          is_paid: editingItem.is_paid,
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({ name: "", description: "", max_days: 0, is_paid: true, is_active: true });
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated", { fallback: "Leave type updated successfully" }));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created", { fallback: "Leave type created successfully" }));
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(tCommon("error", { fallback: "An error occurred" }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return {
    form,
    t,
    tCommon,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
