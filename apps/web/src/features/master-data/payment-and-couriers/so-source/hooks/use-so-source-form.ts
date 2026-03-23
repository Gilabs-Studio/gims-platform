import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateSOSource, useUpdateSOSource } from "./use-so-source";
import type { SOSource } from "../types";

export const soSourceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean(),
});

export type SOSourceFormData = z.infer<typeof soSourceSchema>;

export interface UseSOSourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: SOSource | null;
}

export function useSOSourceForm({ open, onOpenChange, editingItem }: UseSOSourceFormProps) {
  const t = useTranslations("soSource");
  const tCommon = useTranslations("common");

  const createMutation = useCreateSOSource();
  const updateMutation = useUpdateSOSource();

  const form = useForm<SOSourceFormData>({
    resolver: zodResolver(soSourceSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description ?? "",
          is_active: true,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<SOSourceFormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated", { fallback: "SO source updated successfully" }));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created", { fallback: "SO source created successfully" }));
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
