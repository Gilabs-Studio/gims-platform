import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateBusinessType, useUpdateBusinessType } from "./use-business-types";
import { BusinessTypeFormData, getBusinessTypeSchema } from "../schemas/organization.schema";
import type { BusinessType } from "../types";

export interface UseBusinessTypeFormProps {
  open: boolean;
  onClose: () => void;
  businessType?: BusinessType | null;
  initialData?: { name?: string };
  /** Called after a successful create with the newly created item's id and name */
  onCreated?: (item: { id: string; name: string }) => void;
}

export function useBusinessTypeForm({
  open,
  onClose,
  businessType,
  initialData,
  onCreated,
}: UseBusinessTypeFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!businessType;

  const createBusinessType = useCreateBusinessType();
  const updateBusinessType = useUpdateBusinessType();

  const form = useForm<BusinessTypeFormData>({
    resolver: zodResolver(getBusinessTypeSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (businessType) {
        form.reset({
          name: businessType.name,
          description: businessType.description ?? "",
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
  }, [open, businessType, form, initialData?.name]);

  const onSubmit: SubmitHandler<BusinessTypeFormData> = async (data) => {
    try {
      if (isEditing && businessType) {
        await updateBusinessType.mutateAsync({ id: businessType.id, data });
        toast.success(t("businessType.updateSuccess", { fallback: "Business Type updated successfully" }));
      } else {
        const result = await createBusinessType.mutateAsync(data);
        toast.success(t("businessType.createSuccess", { fallback: "Business Type created successfully" }));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save business type:", error);
      toast.error(t("businessType.updateError", { fallback: "Failed to save business type" }));
    }
  };

  const isLoading = createBusinessType.isPending || updateBusinessType.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
