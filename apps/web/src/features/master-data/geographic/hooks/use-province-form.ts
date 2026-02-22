import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateProvince, useUpdateProvince } from "./use-provinces";
import { getProvinceSchema, type CreateProvinceFormData } from "../schemas/geographic.schema";
import type { Province } from "../types";

export interface UseProvinceFormProps {
  open: boolean;
  onClose: () => void;
  province?: Province | null;
}

export function useProvinceForm({ open, onClose, province }: UseProvinceFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!province;

  const createProvince = useCreateProvince();
  const updateProvince = useUpdateProvince();

  const form = useForm<CreateProvinceFormData>({
    resolver: zodResolver(getProvinceSchema(t)),
    defaultValues: { name: "", code: "", country_id: "", is_active: true },
  });

  useEffect(() => {
    if (open) {
      if (province) {
        form.reset({
          name: province.name,
          code: province.code,
          country_id: province.country_id,
          is_active: province.is_active,
        });
      } else {
        form.reset({ name: "", code: "", country_id: "", is_active: true });
      }
    }
  }, [open, province, form]);

  const onSubmit: SubmitHandler<CreateProvinceFormData> = async (data) => {
    try {
      if (isEditing && province) {
        await updateProvince.mutateAsync({ id: province.id, data });
        toast.success(t("province.updateSuccess", { fallback: "Province updated successfully" }));
      } else {
        await createProvince.mutateAsync(data);
        toast.success(t("province.createSuccess", { fallback: "Province created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save province:", error);
      toast.error(t("province.updateError", { fallback: "Failed to save province" }));
    }
  };

  const isLoading = createProvince.isPending || updateProvince.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
