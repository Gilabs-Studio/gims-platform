import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreatePipelineStage, useUpdatePipelineStage } from "./use-pipeline-stage";
import type { PipelineStage } from "../types";

const schema = z.object({
  name: z.string().min(2).max(100),
  color: z.string().max(20).optional(),
  probability: z.number().min(0).max(100),
  is_won: z.boolean(),
  is_lost: z.boolean(),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export interface UsePipelineStageFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: PipelineStage | null;
}

export function usePipelineStageForm({ open, onOpenChange, editingItem }: UsePipelineStageFormProps) {
  const t = useTranslations("pipelineStage");
  const tCommon = useTranslations("common");

  const createMutation = useCreatePipelineStage();
  const updateMutation = useUpdatePipelineStage();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: "#3B82F6", probability: 0, is_won: false, is_lost: false, description: "" },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          color: editingItem.color ?? "#3B82F6",
          probability: editingItem.probability,
          is_won: editingItem.is_won,
          is_lost: editingItem.is_lost,
          description: editingItem.description ?? "",
        });
      } else {
        form.reset({ name: "", color: "#3B82F6", probability: 0, is_won: false, is_lost: false, description: "" });
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
