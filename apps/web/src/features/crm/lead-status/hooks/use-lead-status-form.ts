import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateLeadStatus, useUpdateLeadStatus } from "./use-lead-status";
import type { LeadStatus } from "../types";

const schema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  score: z.number().min(0).max(100),
  color: z.string().max(20).optional(),
  order: z.number().min(0),
  is_active: z.boolean(),
  is_default: z.boolean(),
  is_converted: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export interface UseLeadStatusFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: LeadStatus | null;
}

export function useLeadStatusForm({ open, onOpenChange, editingItem }: UseLeadStatusFormProps) {
  const t = useTranslations("leadStatus");
  const tCommon = useTranslations("common");

  const createMutation = useCreateLeadStatus();
  const updateMutation = useUpdateLeadStatus();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", description: "", score: 0, color: "#3B82F6", order: 0, is_active: true, is_default: false, is_converted: false },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          code: editingItem.code,
          description: editingItem.description ?? "",
          score: editingItem.score,
          color: editingItem.color ?? "#3B82F6",
          order: editingItem.order,
          is_active: editingItem.is_active,
          is_default: editingItem.is_default,
          is_converted: editingItem.is_converted,
        });
      } else {
        form.reset({ name: "", code: "", description: "", score: 0, color: "#3B82F6", order: 0, is_active: true, is_default: false, is_converted: false });
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
