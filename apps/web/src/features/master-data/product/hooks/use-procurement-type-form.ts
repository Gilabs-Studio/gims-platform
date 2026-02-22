import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateProcurementType, useUpdateProcurementType } from "./use-procurement-types";
import type { ProcurementType } from "../types";

export const procurementTypeFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

export type ProcurementTypeFormData = z.infer<typeof procurementTypeFormSchema>;

export interface UseProcurementTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProcurementType | null;
}

export function useProcurementTypeForm({ open, onOpenChange, editingItem }: UseProcurementTypeFormProps) {
  const t = useTranslations("product.procurementType");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreateProcurementType();
  const updateMutation = useUpdateProcurementType();
  
  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ProcurementTypeFormData>({
    resolver: zodResolver(procurementTypeFormSchema),
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
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<ProcurementTypeFormData> = async (data) => {
    try {
      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            is_active: data.is_active,
          },
        });
        toast.success(t("updated", { fallback: "Procurement Type updated successfully" }));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          is_active: data.is_active,
        });
        toast.success(t("created", { fallback: "Procurement Type created successfully" }));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error") : "Failed to create procurement type");
    }
  };

  return {
    form,
    t,
    tCommon,
    tValidation,
    isEditing,
    isSubmitting,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
