import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateDivision, useUpdateDivision } from "./use-divisions";
import { DivisionFormData, getDivisionSchema } from "../schemas/organization.schema";
import type { Division } from "../types";

export interface UseDivisionFormProps {
  open: boolean;
  onClose: () => void;
  division?: Division | null;
}

export function useDivisionForm({ open, onClose, division }: UseDivisionFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!division;

  const createDivision = useCreateDivision();
  const updateDivision = useUpdateDivision();

  const form = useForm<DivisionFormData>({
    resolver: zodResolver(getDivisionSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (division) {
        form.reset({
          name: division.name,
          description: division.description ?? "",
          is_active: true,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, division, form]);

  const onSubmit: SubmitHandler<DivisionFormData> = async (data) => {
    try {
      if (isEditing && division) {
        await updateDivision.mutateAsync({ id: division.id, data });
        toast.success(t("division.updateSuccess", { fallback: "Division updated successfully" }));
      } else {
        await createDivision.mutateAsync(data);
        toast.success(t("division.createSuccess", { fallback: "Division created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save division:", error);
      toast.error(t("division.updateError", { fallback: "Failed to save division" }));
    }
  };

  const isLoading = createDivision.isPending || updateDivision.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
