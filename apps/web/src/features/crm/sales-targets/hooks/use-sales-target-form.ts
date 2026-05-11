import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSalesTargetSchema, type CreateSalesTargetFormData } from "../schemas/sales-target.schema";
import { useCreateSalesTarget, useUpdateSalesTarget } from "./use-sales-targets";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import type { EmployeeSalesTarget } from "../types";

interface UseSalesTargetFormProps {
  target?: EmployeeSalesTarget | null;
  open: boolean;
  onClose: () => void;
}

export function useSalesTargetForm({ target, open, onClose }: UseSalesTargetFormProps) {
  const t = useTranslations("salesTargets");
  const isEdit = !!target;
  const [activeTab, setActiveTab] = useState("basic");
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);

  // Fetch employees for dropdown
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    per_page: 100, // Reasonable default to get most active sales reps
  });
  const employees = employeesData?.data ?? [];

  const createTarget = useCreateSalesTarget();
  const updateTarget = useUpdateSalesTarget();

  const form = useForm<CreateSalesTargetFormData>({
    resolver: zodResolver(createSalesTargetSchema),
    defaultValues: {
      employee_id: "",
      year: currentYear,
      total_target: 0,
      notes: "",
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        target_amount: 0,
        notes: "",
      })),
    },
  });

  const { watch, setValue, reset, control } = form;
  const months = useWatch({ control, name: "months" });
  const totalTarget = watch("total_target");

  // Calculate total whenever months change
  useEffect(() => {
    if (months && months.length === 12) {
      const calculatedTotal = months.reduce((acc, curr) => acc + (Number(curr.target_amount) || 0), 0);
      if (calculatedTotal !== totalTarget) {
        setValue("total_target", calculatedTotal, { shouldValidate: true });
      }
    }
  }, [months, setValue, totalTarget]);

  // Auto-select employee if only 1 is available (useful for OWN scope)
  useEffect(() => {
    if (employees.length === 1 && !form.getValues("employee_id")) {
      setValue("employee_id", employees[0].id, { shouldValidate: true });
    }
  }, [employees, form, setValue]);

  // Reset form when modal opens/closes or target changes
  useEffect(() => {
    if (open) {
      if (target) {
        // Pre-fill for edit
        const filledMonths = Array.from({ length: 12 }, (_, i) => {
          const monthNum = i + 1;
          const existing = target.monthly_targets?.find((m) => m.month === monthNum);
          return {
            month: monthNum,
            target_amount: existing?.target_amount || 0,
            notes: existing?.notes || "",
          };
        });

        reset({
          employee_id: target.employee_id,
          year: target.year,
          total_target: target.total_target,
          notes: target.notes || "",
          months: filledMonths,
        });
      } else {
        // Reset for create
        reset({
          employee_id: "",
          year: currentYear,
          total_target: 0,
          notes: "",
          months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        });
      }
      setActiveTab("basic");
    }
  }, [open, target, reset, currentYear]);

  const handleNext = () => {
    // Validate basic tab before moving to months
    form.trigger(["employee_id", "year"]).then((isValid) => {
      if (isValid) {
        setActiveTab("months");
      }
    });
  };

  const handleFormSubmit = async (data: CreateSalesTargetFormData) => {
    try {
      if (isEdit && target) {
        await updateTarget.mutateAsync({
          id: target.id,
          data: {
            total_target: data.total_target,
            notes: data.notes,
            months: data.months,
          },
        });
        toast.success(t("updated"));
      } else {
        await createTarget.mutateAsync(data);
        toast.success(t("created"));
      }
      onClose();
    } catch (error: any) {
      // Check if it's a conflict error (409)
      if (error.response?.status === 409) {
        toast.error(t("conflict"));
      } else {
        toast.error(error.message || t("common.error"));
      }
    }
  };

  const onInvalid = () => {
    toast.error(t("validationError"));
    // If error in basic tab, switch to it
    const errs = form.formState.errors;
    if (errs.employee_id || errs.year) {
      setActiveTab("basic");
    }
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date(2000, monthNumber - 1, 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  return {
    form,
    t,
    isEdit,
    activeTab,
    setActiveTab,
    isLoading: createTarget.isPending || updateTarget.isPending,
    isFormLoading: open && !employeesData && isLoadingEmployees,
    employees,
    totalTarget,
    years,
    fields: months || [],
    getMonthName,
    handleNext,
    handleFormSubmit,
    onInvalid,
  };
}
