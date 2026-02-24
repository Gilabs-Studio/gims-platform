import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateCountry, useUpdateCountry } from "./use-countries";
import { getCountrySchema, type CreateCountryFormData } from "../schemas/geographic.schema";
import type { Country } from "../types";

export interface UseCountryFormProps {
  open: boolean;
  onClose: () => void;
  country?: Country | null;
}

export function useCountryForm({ open, onClose, country }: UseCountryFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!country;

  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();

  const form = useForm<CreateCountryFormData>({
    resolver: zodResolver(getCountrySchema(t)),
    defaultValues: {
      name: "",
      code: "",
      phone_code: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (country) {
        form.reset({
          name: country.name,
          code: country.code,
          phone_code: country.phone_code ?? "",
          is_active: country.is_active,
        });
      } else {
        form.reset({
          name: "",
          code: "",
          phone_code: "",
          is_active: true,
        });
      }
    }
  }, [open, country, form]);

  const onSubmit: SubmitHandler<CreateCountryFormData> = async (data) => {
    try {
      if (isEditing && country) {
        await updateCountry.mutateAsync({ id: country.id, data });
        toast.success(t("country.updateSuccess", { fallback: "Country updated successfully" }));
      } else {
        await createCountry.mutateAsync(data);
        toast.success(t("country.createSuccess", { fallback: "Country created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save country:", error);
      toast.error(t("country.updateError", { fallback: "Failed to save country" }));
    }
  };

  const isLoading = createCountry.isPending || updateCountry.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
