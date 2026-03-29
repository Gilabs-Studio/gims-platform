import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateArea, useUpdateArea, useAreaFormData } from "./use-areas";
import { AreaFormData, getAreaSchema } from "../schemas/organization.schema";
import type { Area } from "../types";

export interface UseAreaFormProps {
  open: boolean;
  onClose: () => void;
  area?: Area | null;
}

const DEFAULT_COLOR = "var(--color-primary)";

const DEFAULT_VALUES: AreaFormData = {
  name: "",
  description: "",
  is_active: true,
  code: "",
  color: DEFAULT_COLOR,
  manager_id: "",
  province: "",
  regency: "",
  district: "",
};

export function useAreaForm({ open, onClose, area }: UseAreaFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!area;

  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const { data: formDataResp } = useAreaFormData();

  const employees = formDataResp?.data?.employees ?? [];

  const form = useForm<AreaFormData>({
    resolver: zodResolver(getAreaSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      if (area) {
        form.reset({
          name: area.name,
          description: area.description ?? "",
          is_active: true,
          code: area.code ?? "",
          color: area.color ?? DEFAULT_COLOR,
          manager_id: area.manager_id ?? "",
          province: area.province ?? "",
          regency: area.regency ?? "",
          district: area.district ?? "",
        });
      } else {
        form.reset(DEFAULT_VALUES);
      }
    }
  }, [open, area, form]);

  const onSubmit: SubmitHandler<AreaFormData> = async (data) => {
    // Clean empty string UUIDs to null for optional foreign keys
    const cleanedData = {
      ...data,
      manager_id: data.manager_id || null,
    };

    try {
      if (isEditing && area) {
        await updateArea.mutateAsync({ id: area.id, data: cleanedData });
        toast.success(t("area.updateSuccess"));
      } else {
        await createArea.mutateAsync(cleanedData);
        toast.success(t("area.createSuccess"));
      }
      onClose();
    } catch {
      toast.error(t("area.saveError"));
    }
  };

  const isLoading = createArea.isPending || updateArea.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    employees,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
