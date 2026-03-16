import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateUnitOfMeasure, useUpdateUnitOfMeasure } from "./use-units-of-measure";
import type { UnitOfMeasure } from "../types";

export const unitOfMeasureFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(20, "Symbol cannot exceed 20 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

export type UnitOfMeasureFormData = z.infer<typeof unitOfMeasureFormSchema>;

export interface UseUnitOfMeasureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: UnitOfMeasure | null;
  onCreated?: (id: string) => void;
}

export function useUnitOfMeasureForm({ open, onOpenChange, editingItem, onCreated }: UseUnitOfMeasureFormProps) {
  const t = useTranslations("product.unitOfMeasure");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreateUnitOfMeasure();
  const updateMutation = useUpdateUnitOfMeasure();
  
  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<UnitOfMeasureFormData>({
    resolver: zodResolver(unitOfMeasureFormSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          symbol: editingItem.symbol,
          description: editingItem.description ?? "",
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          name: "",
          symbol: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<UnitOfMeasureFormData> = async (data) => {
    try {
      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: data.name,
            symbol: data.symbol,
            description: data.description || undefined,
            is_active: data.is_active,
          },
        });
        toast.success(t("updated", { fallback: "UoM updated successfully" }));
      } else {
        const result = await createMutation.mutateAsync({
          name: data.name,
          symbol: data.symbol,
          description: data.description || undefined,
          is_active: data.is_active,
        });
        toast.success(t("created", { fallback: "UoM created successfully" }));
        if (onCreated && result?.data?.id) {
          onCreated(result.data.id);
        }
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error") : "Failed to create UoM");
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
