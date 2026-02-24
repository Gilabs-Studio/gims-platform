import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateCity, useUpdateCity } from "./use-cities";
import { getCitySchema, type CreateCityFormData } from "../schemas/geographic.schema";
import type { City } from "../types";

export interface UseCityFormProps {
  open: boolean;
  onClose: () => void;
  city?: City | null;
}

export function useCityForm({ open, onClose, city }: UseCityFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!city;

  const createCity = useCreateCity();
  const updateCity = useUpdateCity();

  const form = useForm<CreateCityFormData>({
    resolver: zodResolver(getCitySchema(t)),
    defaultValues: { name: "", code: "", province_id: "", type: "city", is_active: true },
  });

  useEffect(() => {
    if (open) {
      if (city) {
        form.reset({
          name: city.name,
          code: city.code,
          province_id: city.province_id,
          type: city.type,
          is_active: city.is_active,
        });
      } else {
        form.reset({ name: "", code: "", province_id: "", type: "city", is_active: true });
      }
    }
  }, [open, city, form]);

  const onSubmit: SubmitHandler<CreateCityFormData> = async (data) => {
    try {
      if (isEditing && city) {
        await updateCity.mutateAsync({ id: city.id, data });
        toast.success(t("city.updateSuccess", { fallback: "City updated successfully" }));
      } else {
        await createCity.mutateAsync(data);
        toast.success(t("city.createSuccess", { fallback: "City created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save city:", error);
      toast.error(t("city.updateError", { fallback: "Failed to save city" }));
    }
  };

  const isLoading = createCity.isPending || updateCity.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
