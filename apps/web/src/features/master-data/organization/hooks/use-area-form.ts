import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateArea, useUpdateArea } from "./use-areas";
import { AreaFormData, getAreaSchema } from "../schemas/organization.schema";
import type { Area } from "../types";

export interface UseAreaFormProps {
  open: boolean;
  onClose: () => void;
  area?: Area | null;
}

export function useAreaForm({ open, onClose, area }: UseAreaFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!area;

  const createArea = useCreateArea();
  const updateArea = useUpdateArea();

  const form = useForm<AreaFormData>({
    resolver: zodResolver(getAreaSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (area) {
        form.reset({
          name: area.name,
          description: area.description ?? "",
          is_active: area.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, area, form]);

  const onSubmit: SubmitHandler<AreaFormData> = async (data) => {
    try {
      if (isEditing && area) {
        await updateArea.mutateAsync({ id: area.id, data });
        toast.success(t("area.updateSuccess", { fallback: "Area updated successfully" }));
      } else {
        await createArea.mutateAsync(data);
        toast.success(t("area.createSuccess", { fallback: "Area created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save area:", error);
      toast.error(t("area.updateError", { fallback: "Failed to save area" }));
    }
  };

  const isLoading = createArea.isPending || updateArea.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
