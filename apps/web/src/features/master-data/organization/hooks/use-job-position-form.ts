import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateJobPosition, useUpdateJobPosition } from "./use-job-positions";
import { JobPositionFormData, getJobPositionSchema } from "../schemas/organization.schema";
import type { JobPosition } from "../types";

export interface UseJobPositionFormProps {
  open: boolean;
  onClose: () => void;
  jobPosition?: JobPosition | null;
}

export function useJobPositionForm({ open, onClose, jobPosition }: UseJobPositionFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!jobPosition;

  const createJobPosition = useCreateJobPosition();
  const updateJobPosition = useUpdateJobPosition();

  const form = useForm<JobPositionFormData>({
    resolver: zodResolver(getJobPositionSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (jobPosition) {
        form.reset({
          name: jobPosition.name,
          description: jobPosition.description ?? "",
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
  }, [open, jobPosition, form]);

  const onSubmit: SubmitHandler<JobPositionFormData> = async (data) => {
    try {
      if (isEditing && jobPosition) {
        await updateJobPosition.mutateAsync({ id: jobPosition.id, data });
        toast.success(t("jobPosition.updateSuccess", { fallback: "Job Position updated successfully" }));
      } else {
        await createJobPosition.mutateAsync(data);
        toast.success(t("jobPosition.createSuccess", { fallback: "Job Position created successfully" }));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save job position:", error);
      toast.error(t("jobPosition.updateError", { fallback: "Failed to save job position" }));
    }
  };

  const isLoading = createJobPosition.isPending || updateJobPosition.isPending;

  return {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
