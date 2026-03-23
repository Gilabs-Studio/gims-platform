import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateProductType, useUpdateProductType } from "./use-product-types";
import type { ProductType } from "../types";

export const productTypeFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

export type ProductTypeFormData = z.infer<typeof productTypeFormSchema>;

export interface UseProductTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProductType | null;
  onCreated?: (id: string) => void;
}

export function useProductTypeForm({ open, onOpenChange, editingItem, onCreated }: UseProductTypeFormProps) {
  const t = useTranslations("product.productType");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreateProductType();
  const updateMutation = useUpdateProductType();
  
  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ProductTypeFormData>({
    resolver: zodResolver(productTypeFormSchema),
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
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<ProductTypeFormData> = async (data) => {
    try {
      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            is_active: true,
          },
        });
        toast.success(t("updated", { fallback: "Product Type updated successfully" }));
      } else {
        const result = await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          is_active: true,
        });
        toast.success(t("created", { fallback: "Product Type created successfully" }));
        if (onCreated && result?.data?.id) {
          onCreated(result.data.id);
        }
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error") : "Failed to create type");
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
