import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateVillage, useUpdateVillage } from "./use-villages";
import { getVillageSchema, type CreateVillageFormData } from "../schemas/geographic.schema";
import type { Village } from "../types";

export interface UseVillageFormProps {
  open: boolean;
  onClose: () => void;
  village?: Village | null;
}

export function useVillageForm({ open, onClose, village }: UseVillageFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!village;

  const createVillage = useCreateVillage();
  const updateVillage = useUpdateVillage();

  const form = useForm<CreateVillageFormData>({
    resolver: zodResolver(getVillageSchema(t)),
    defaultValues: { name: "", code: "", district_id: "", postal_code: "", type: "village", is_active: true },
  });

  useEffect(() => {
    if (open) {
      if (village) {
        form.reset({
          name: village.name,
          code: village.code,
          district_id: village.district_id,
          postal_code: village.postal_code ?? "",
          type: village.type,
          is_active: village.is_active,
        });
      } else {
        form.reset({ name: "", code: "", district_id: "", postal_code: "", type: "village", is_active: true });
      }
    }
  }, [open, village, form]);

  const onSubmit: SubmitHandler<CreateVillageFormData> = async (data) => {
    try {
      if (isEditing && village) {
        await updateVillage.mutateAsync({ id: village.id, data });
        toast.success(t("village.updateSuccess", { fallback: "Village updated successfully" }));
      } else {
        await createVillage.mutateAsync(data);
        toast.success(t("village.createSuccess", { fallback: "Village created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save village:", error);
      toast.error(t("village.updateError", { fallback: "Failed to save village" }));
    }
  };

  const isLoading = createVillage.isPending || updateVillage.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
