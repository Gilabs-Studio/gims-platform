import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateDistrict, useUpdateDistrict } from "./use-districts";
import { getDistrictSchema, type CreateDistrictFormData } from "../schemas/geographic.schema";
import type { District } from "../types";

export interface UseDistrictFormProps {
  open: boolean;
  onClose: () => void;
  district?: District | null;
}

export function useDistrictForm({ open, onClose, district }: UseDistrictFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!district;

  const createDistrict = useCreateDistrict();
  const updateDistrict = useUpdateDistrict();

  const form = useForm<CreateDistrictFormData>({
    resolver: zodResolver(getDistrictSchema(t)),
    defaultValues: { name: "", code: "", city_id: "", is_active: true },
  });

  useEffect(() => {
    if (open) {
      if (district) {
        form.reset({
          name: district.name,
          code: district.code,
          city_id: district.city_id,
          is_active: district.is_active,
        });
      } else {
        form.reset({ name: "", code: "", city_id: "", is_active: true });
      }
    }
  }, [open, district, form]);

  const onSubmit: SubmitHandler<CreateDistrictFormData> = async (data) => {
    try {
      if (isEditing && district) {
        await updateDistrict.mutateAsync({ id: district.id, data });
        toast.success(t("district.updateSuccess", { fallback: "District updated successfully" }));
      } else {
        await createDistrict.mutateAsync(data);
        toast.success(t("district.createSuccess", { fallback: "District created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save district:", error);
      toast.error(t("district.updateError", { fallback: "Failed to save district" }));
    }
  };

  const isLoading = createDistrict.isPending || updateDistrict.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
