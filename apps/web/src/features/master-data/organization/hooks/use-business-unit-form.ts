import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateBusinessUnit, useUpdateBusinessUnit } from "./use-business-units";
import { BusinessUnitFormData, getBusinessUnitSchema } from "../schemas/organization.schema";
import type { BusinessUnit } from "../types";

export interface UseBusinessUnitFormProps {
  open: boolean;
  onClose: () => void;
  businessUnit?: BusinessUnit | null;
}

export function useBusinessUnitForm({ open, onClose, businessUnit }: UseBusinessUnitFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!businessUnit;

  const createBusinessUnit = useCreateBusinessUnit();
  const updateBusinessUnit = useUpdateBusinessUnit();

  const form = useForm<BusinessUnitFormData>({
    resolver: zodResolver(getBusinessUnitSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (businessUnit) {
        form.reset({
          name: businessUnit.name,
          description: businessUnit.description ?? "",
          is_active: businessUnit.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, businessUnit, form]);

  const onSubmit: SubmitHandler<BusinessUnitFormData> = async (data) => {
    try {
      if (isEditing && businessUnit) {
        await updateBusinessUnit.mutateAsync({ id: businessUnit.id, data });
        toast.success(t("businessUnit.updateSuccess", { fallback: "Business Unit updated successfully" }));
      } else {
        await createBusinessUnit.mutateAsync(data);
        toast.success(t("businessUnit.createSuccess", { fallback: "Business Unit created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save business unit:", error);
      toast.error(t("businessUnit.updateError", { fallback: "Failed to save business unit" }));
    }
  };

  const isLoading = createBusinessUnit.isPending || updateBusinessUnit.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
