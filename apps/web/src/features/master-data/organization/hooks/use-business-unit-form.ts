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
  initialData?: { name?: string };
  /** Called after a successful create with the newly created item's id and name */
  onCreated?: (item: { id: string; name: string }) => void;
}

export function useBusinessUnitForm({ open, onClose, businessUnit, initialData, onCreated }: UseBusinessUnitFormProps) {
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
          is_active: true,
        });
      } else {
        form.reset({
          name: initialData?.name ?? "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, businessUnit, form, initialData?.name]);

  const onSubmit: SubmitHandler<BusinessUnitFormData> = async (data) => {
    try {
      if (isEditing && businessUnit) {
        await updateBusinessUnit.mutateAsync({ id: businessUnit.id, data });
        toast.success(t("businessUnit.updateSuccess", { fallback: "Business Unit updated successfully" }));
      } else {
        const result = await createBusinessUnit.mutateAsync(data);
        toast.success(t("businessUnit.createSuccess", { fallback: "Business Unit created successfully" }));
        onCreated?.({ id: result.data.id, name: result.data.name });
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
