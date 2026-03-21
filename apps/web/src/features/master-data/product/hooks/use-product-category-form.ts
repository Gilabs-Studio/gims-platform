import { useEffect, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  useCreateProductCategory,
  useUpdateProductCategory,
  useProductCategories,
} from "./use-product-categories";
import type { ProductCategory } from "../types";

export const productCategoryFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  parent_id: z.string().optional().nullable(),
  is_active: z.boolean(),
});

export type ProductCategoryFormData = z.infer<typeof productCategoryFormSchema>;

export interface UseProductCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProductCategory | null;
  onCreated?: (id: string) => void;
}

export function useProductCategoryForm({ open, onOpenChange, editingItem, onCreated }: UseProductCategoryFormProps) {
  const t = useTranslations("product.productCategory");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreateProductCategory();
  const updateMutation = useUpdateProductCategory();
  
  // Fetch categories for parent selection, only when modal is open
  const { data: categoriesData } = useProductCategories(
    { per_page: 20 },
    { enabled: open }
  );
  
  // Filter out current item from parent options to prevent cycles
  const parentOptions = useMemo(() => {
    return categoriesData?.data.filter((c) => c.id !== editingItem?.id) ?? [];
  }, [categoriesData?.data, editingItem?.id]);

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ProductCategoryFormData>({
    resolver: zodResolver(productCategoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description ?? "",
          parent_id: editingItem.parent_id,
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          parent_id: null,
          is_active: true,
        });
      }
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<ProductCategoryFormData> = async (data) => {
    try {
      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            parent_id: data.parent_id || null,
            is_active: data.is_active,
          },
        });
        toast.success(t("updated", { fallback: "Product Category updated successfully" }));
      } else {
        const result = await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          parent_id: data.parent_id || null,
          is_active: data.is_active,
        });
        toast.success(t("created", { fallback: "Product Category created successfully" }));
        if (onCreated && result?.data?.id) {
          onCreated(result.data.id);
        }
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error") : "Failed to create category");
    }
  };

  return {
    form,
    t,
    tCommon,
    tValidation,
    isEditing,
    isSubmitting,
    parentOptions,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
