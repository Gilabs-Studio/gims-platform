import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getTargetSchema,
  getUpdateTargetSchema,
  type CreateTargetFormData,
  type UpdateTargetFormData,
} from "../schemas/target.schema";
import { useCreateYearlyTarget, useUpdateYearlyTarget, useYearlyTarget } from "./use-targets";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import type { YearlyTarget } from "../types";
import { sortOptions } from "@/lib/utils";

const STORAGE_KEY = "target_form_cache";

export interface UseTargetFormProps {
  target?: YearlyTarget | null;
  open: boolean;
  onClose: () => void;
}

export function useTargetForm({ target, open, onClose }: UseTargetFormProps) {
  const isEdit = !!target;
  const t = useTranslations("targets");
  const createTarget = useCreateYearlyTarget();
  const updateTarget = useUpdateYearlyTarget();
  
  const [activeTab, setActiveTab] = useState<"basic" | "months">("basic");
  const [isValidating, setIsValidating] = useState(false);

  const { data: fullTargetData, isLoading: isLoadingTarget } = useYearlyTarget(
    target?.id ?? "",
    { enabled: open && isEdit && !!target?.id }
  );

  const { data: areasData } = useAreas({ per_page: 100 }, { enabled: open });

  const areas = useMemo(() => {
    const data = areasData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [areasData?.data]);

  const schema = isEdit ? getUpdateTargetSchema(t) : getTargetSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateTargetFormData | UpdateTargetFormData>;

  const form = useForm<CreateTargetFormData | UpdateTargetFormData>({
    resolver: formResolver,
    defaultValues: target
      ? {
          year: target.year,
          area_id: target.area_id,
          total_target: target.total_target,
          notes: target.notes ?? "",
          months: target.monthly_targets?.map((m: any) => ({
            month: m.month,
            target_amount: m.target_amount,
            notes: m.notes ?? "",
          })) ?? Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        }
      : {
          year: new Date().getFullYear(),
          total_target: 0,
          months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        },
  });

  const {
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
  } = form;

  const { fields } = useFieldArray({
    control,
    name: "months",
  });

  const watchedMonths = useWatch({ control, name: "months" });
  const totalTarget = useWatch({ control, name: "total_target" });
  
  // Auto-calculate total target when monthly targets change
  useEffect(() => {
    if (watchedMonths) {
      const total = watchedMonths.reduce((sum, m: { target_amount?: number | null } | undefined) => sum + (m?.target_amount ?? 0), 0);
      setValue("total_target", total, { shouldValidate: true });
    }
  }, [watchedMonths, setValue]);

  // Reset form when target data changes (for edit mode)
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullTargetData?.data) {
        const data = fullTargetData.data;
        setTimeout(() => {
          reset({
            year: data.year,
            area_id: data.area_id,
            total_target: data.total_target,
            notes: data.notes ?? "",
            months: data.monthly_targets?.map((m: any) => ({
              month: m.month,
              target_amount: m.target_amount,
              notes: m.notes ?? "",
            })) ?? Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              target_amount: 0,
              notes: "",
            })),
          });
        }, 10);
      }
      return;
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        reset(JSON.parse(cached));
      } catch {
        reset({
          year: new Date().getFullYear(),
          total_target: 0,
          months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        });
      }
    } else {
      reset({
        year: new Date().getFullYear(),
        total_target: 0,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          target_amount: 0,
          notes: "",
        })),
      });
    }
  }, [open, isEdit, fullTargetData, reset]);

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = ["year", "area_id", "notes"];
      const isValid = await trigger(basicFields as Extract<keyof CreateTargetFormData, string>[]);

      if (isValid) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getValues()));
        setActiveTab("months");
      } else {
        toast.error(t("common.validationError"));
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFormSubmit = async (data: CreateTargetFormData | UpdateTargetFormData) => {
    try {
      if (isEdit && target) {
        await updateTarget.mutateAsync({
          id: target.id,
          data: data as UpdateTargetFormData,
        });
        toast.success(t("updated"));
      } else {
        await createTarget.mutateAsync(data as CreateTargetFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const isLoading = createTarget.isPending || updateTarget.isPending;
  const isFormLoading = isEdit && isLoadingTarget && !fullTargetData;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const onInvalid = (errors: FieldErrors<CreateTargetFormData | UpdateTargetFormData>) => {
      const basicFields = ["year", "area_id", "notes"];
      const basicError = basicFields.some((field) => 
        errors[field as keyof CreateTargetFormData | keyof UpdateTargetFormData]
      );
  
      if (basicError) {
        setActiveTab("basic");
        setTimeout(() => {
          toast.error(t("common.validationError"));
        }, 100);
      }
  };

  return {
    form,
    t,
    isEdit,
    activeTab,
    setActiveTab,
    isValidating,
    isLoading,
    isFormLoading,
    areas,
    fields,
    totalTarget,
    years,
    getMonthName,
    handleNext,
    handleFormSubmit,
    onInvalid,
  };
}
