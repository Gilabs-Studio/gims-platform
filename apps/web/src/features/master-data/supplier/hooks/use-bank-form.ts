import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateBank, useUpdateBank } from "./use-banks";
import type { Bank } from "../types";

export const bankFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code cannot exceed 20 characters"),
  swift_code: z.string().max(20, "Swift code cannot exceed 20 characters").optional(),
  is_active: z.boolean(),
});

export type BankFormData = z.infer<typeof bankFormSchema>;

export interface UseBankFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Bank | null;
}

export function useBankForm({ open, onOpenChange, editingItem }: UseBankFormProps) {
  const t = useTranslations("supplier.bank");
  const tCommon = useTranslations("supplier.common");
  const tValidation = useTranslations("supplier.validation");

  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<BankFormData>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: {
      name: "",
      code: "",
      swift_code: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          code: editingItem.code,
          swift_code: editingItem.swift_code ?? "",
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          name: "",
          code: "",
          swift_code: "",
          is_active: true,
        });
      }
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<BankFormData> = async (data) => {
    try {
      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: data.name,
            code: data.code,
            swift_code: data.swift_code || undefined,
            is_active: data.is_active,
          },
        });
        toast.success(t("updateSuccess", { fallback: "Bank updated successfully" }));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          code: data.code,
          swift_code: data.swift_code || undefined,
          is_active: data.is_active,
        });
        toast.success(t("createSuccess", { fallback: "Bank created successfully" }));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error_update") : "Failed to create bank");
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
