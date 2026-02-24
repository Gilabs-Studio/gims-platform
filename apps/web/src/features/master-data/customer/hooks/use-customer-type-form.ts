import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  useCreateCustomerType,
  useUpdateCustomerType,
} from "./use-customer-types";
import type { CustomerType } from "../types";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export interface UseCustomerTypeFormProps {
  open: boolean;
  onClose: () => void;
  editingItem: CustomerType | null;
}

export function useCustomerTypeForm({ open, onClose, editingItem }: UseCustomerTypeFormProps) {
  const t = useTranslations("customer.customerType");
  const tCommon = useTranslations("customer.common");
  const tValidation = useTranslations("customer.validation");

  const createMutation = useCreateCustomerType();
  const updateMutation = useUpdateCustomerType();

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
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

  const onSubmit = async (data: FormData) => {
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
        toast.success(t("updateSuccess"));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          is_active: data.is_active,
        });
        toast.success(t("createSuccess"));
      }
      onClose();
    } catch {
      toast.error(isEditing ? tCommon("error_update") : "Failed to create customer type");
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
