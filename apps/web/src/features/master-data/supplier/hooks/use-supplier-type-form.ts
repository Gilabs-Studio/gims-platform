import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateSupplierType, useUpdateSupplierType } from "./use-supplier-types";
import type { SupplierType } from "../types";

export const supplierTypeFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

export type SupplierTypeFormData = z.infer<typeof supplierTypeFormSchema>;

export interface UseSupplierTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: SupplierType | null;
}

export function useSupplierTypeForm({ open, onOpenChange, editingItem }: UseSupplierTypeFormProps) {
  const t = useTranslations("supplier.supplierType");
  const tCommon = useTranslations("supplier.common");
  const tValidation = useTranslations("supplier.validation");

  const createMutation = useCreateSupplierType();
  const updateMutation = useUpdateSupplierType();

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<SupplierTypeFormData>({
    resolver: zodResolver(supplierTypeFormSchema),
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

  const onSubmit: SubmitHandler<SupplierTypeFormData> = async (data) => {
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
        toast.success(t("updateSuccess", { fallback: "Supplier Type updated successfully" }));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          is_active: data.is_active,
        });
        toast.success(t("createSuccess", { fallback: "Supplier Type created successfully" }));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error_update") : "Failed to create supplier type");
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
