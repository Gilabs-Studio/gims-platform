import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreatePackaging, useUpdatePackaging } from "./use-packagings";
import type { Packaging } from "../types";

export const packagingFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

export type PackagingFormData = z.infer<typeof packagingFormSchema>;

export interface UsePackagingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Packaging | null;
}

export function usePackagingForm({ open, onOpenChange, editingItem }: UsePackagingFormProps) {
  const t = useTranslations("product.packaging");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreatePackaging();
  const updateMutation = useUpdatePackaging();
  
  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<PackagingFormData>({
    resolver: zodResolver(packagingFormSchema),
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

  const onSubmit: SubmitHandler<PackagingFormData> = async (data) => {
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
        toast.success(t("updated", { fallback: "Packaging updated successfully" }));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          is_active: data.is_active,
        });
        toast.success(t("created", { fallback: "Packaging created successfully" }));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error") : "Failed to create packaging");
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
