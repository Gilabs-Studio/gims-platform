import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateArea, useUpdateArea, useAreaFormData } from "./use-areas";
import { AreaFormData, getAreaSchema } from "../schemas/organization.schema";
import { normalizeColorForAPI } from "@/lib/color-utils";
import type { Area, CreateAreaData } from "../types";

type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiValidationErrorResponse = {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        field_errors?: ApiFieldError[];
      };
      message?: string;
    };
  };
};

function getApiErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined;
  }

  const responseData = (error as ApiValidationErrorResponse).response?.data;
  const fieldErrors = responseData?.error?.field_errors;

  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const matchingFieldError = fieldErrors.find((fieldError) => fieldError.field === "regency") ?? fieldErrors[0];
    const message = matchingFieldError?.message?.trim();
    if (message) {
      return message;
    }
  }

  const apiMessage = responseData?.error?.message;
  if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  const fallbackMessage = responseData?.message;
  if (typeof fallbackMessage === "string" && fallbackMessage.trim().length > 0) {
    return fallbackMessage;
  }

  return undefined;
}

export interface UseAreaFormProps {
  open: boolean;
  onClose: () => void;
  onCreateSuccess?: () => void;
  area?: Area | null;
  initialPolygon?: GeoJSON.Geometry | null;
  initialSelectedCities?: string[];
  /** Existing areas that need their regency updated after the new area steals some cities */
  conflictedAreaUpdates?: Array<{ id: string; regency: string }>;
}

const DEFAULT_COLOR = "#3B82F6"; // Primary blue (converted from var(--color-primary))

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

export function useAreaForm({ open, onClose, onCreateSuccess, area, initialPolygon, initialSelectedCities, conflictedAreaUpdates }: UseAreaFormProps) {
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
          color: normalizeColorForAPI(area.color) ?? DEFAULT_COLOR,
          manager_id: area.manager_id ?? "",
          province: area.province ?? "",
          regency: area.regency ?? "",
          district: area.district ?? "",
        });
      } else {
        const regencyValue = initialSelectedCities?.join(", ") ?? "";
        form.reset({
          ...DEFAULT_VALUES,
          regency: regencyValue,
        });
      }
    }
  }, [open, area, initialSelectedCities]);

  const onSubmit: SubmitHandler<AreaFormData> = async (data) => {
    // Clean empty string UUIDs to null for optional foreign keys
    // Convert color from template variable to hex before sending to API
    const cleanedData = {
      ...data,
      manager_id: data.manager_id || null,
      color: normalizeColorForAPI(data.color),
    };

    try {
      if (isEditing && area) {
        await updateArea.mutateAsync({ id: area.id, data: cleanedData });
        toast.success(t("area.updateSuccess"));
      } else {
        const payload: CreateAreaData = {
          ...cleanedData,
          regency: cleanedData.regency || (initialSelectedCities?.join(", ") ?? ""),
          polygon: initialPolygon ?? null,
        };
        await createArea.mutateAsync(payload);
        toast.success(t("area.createSuccess"));

        // Handle conflicted area updates separately in batch to avoid cascade
        if (conflictedAreaUpdates?.length) {
          // Use setTimeout to defer these updates after form closes and state settles
          setTimeout(() => {
            Promise.allSettled(
              conflictedAreaUpdates.map(({ id, regency }) =>
                updateArea.mutateAsync({ id, data: { regency } })
              )
            ).catch(() => {
              // Silently handle any errors in batch updates
            });
          }, 100);
        }

        onCreateSuccess?.();
      }
      onClose();
    } catch (error) {
      const apiErrorMessage = getApiErrorMessage(error);
      if (apiErrorMessage) {
        form.setError("root", {
          type: "server",
          message: apiErrorMessage,
        });
        form.setError("regency", {
          type: "server",
          message: apiErrorMessage,
        });
        toast.error(apiErrorMessage);
        return;
      }

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
