import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSalesTargetSchema, type CreateSalesTargetFormData } from "../schemas/sales-target.schema";
import {
  useAvailableSalesTargetEmployees,
  useCreateSalesTarget,
  useUpdateSalesTarget,
} from "./use-sales-targets";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { EmployeeSalesTarget } from "../types";

interface UseSalesTargetFormProps {
  target?: EmployeeSalesTarget | null;
  open: boolean;
  onClose: () => void;
}

export function useSalesTargetForm({ target, open, onClose }: UseSalesTargetFormProps) {
  const t = useTranslations("salesTargets");
  const isEdit = !!target;
  const { user } = useAuthStore();
  const readScope = (usePermissionScope("sales_target.read") ?? "").toString().trim().toUpperCase();
  const isOwnScope = readScope === "OWN";

  const employeeIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ownEmployeeId = typeof user?.employee_id === "string" ? user.employee_id.trim() : "";
  const ownEmployeeIdSafe = employeeIDRegex.test(ownEmployeeId) ? ownEmployeeId : "";
  const [activeTab, setActiveTab] = useState("basic");
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);

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
  const selectedYear = useWatch({ control, name: "year" });
  const totalTarget = watch("total_target");

  const { data: availableEmployeesData, isLoading: isLoadingEmployees } =
    useAvailableSalesTargetEmployees(
      Number.isFinite(selectedYear) ? selectedYear : currentYear,
      isEdit ? target?.employee_id : undefined,
      { enabled: open },
    );
  const employees = useMemo(() => availableEmployeesData?.data ?? [], [availableEmployeesData]);

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
    const currentEmployee = form.getValues("employee_id");
    if (currentEmployee) {
      return;
    }

    if (isOwnScope && ownEmployeeIdSafe) {
      const employeeExists = employees.some((employee) => employee.id === ownEmployeeIdSafe);
      if (employeeExists || employees.length === 0) {
        setValue("employee_id", ownEmployeeIdSafe, { shouldValidate: true });
        return;
      }
    }

    if (employees.length === 1) {
      setValue("employee_id", employees[0].id, { shouldValidate: true });
    }
  }, [employees, form, isOwnScope, ownEmployeeIdSafe, setValue]);

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
          employee_id: isOwnScope ? ownEmployeeIdSafe : "",
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
  }, [open, target, reset, currentYear, isOwnScope, ownEmployeeIdSafe]);

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
      if (!isEdit && !employeeIDRegex.test(String(data.employee_id || "").trim())) {
        toast.error(t("validationError"));
        setActiveTab("basic");
        return;
      }

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
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { error?: { code?: string; details?: { message?: string }; message?: string }; message?: string } }; message?: string };
      const statusCode = axiosError.response?.status;
      const apiCode = axiosError.response?.data?.error?.code;
      const detailMessage = axiosError.response?.data?.error?.details?.message;
      const fallbackMessage = axiosError.response?.data?.error?.message;
      const message = String(detailMessage || fallbackMessage || axiosError.message || "").toLowerCase();

      if (
        statusCode === 409 ||
        apiCode === "SALES_TARGET_CONFLICT" ||
        message.includes("already exists") ||
        message.includes("already exist") ||
        message.includes("sudah ada")
      ) {
        toast.error(t("conflict"));
      } else {
        toast.error((error as Error)?.message || t("common.error"));
      }
    }
  };

  const setAllMonthsTarget = (targetAmount: number) => {
    const safeAmount = Number.isFinite(targetAmount) && targetAmount > 0 ? targetAmount : 0;
    for (let i = 0; i < 12; i += 1) {
      setValue(`months.${i}.target_amount`, safeAmount, { shouldValidate: true, shouldDirty: true });
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
    isOwnScope,
    activeTab,
    setActiveTab,
    isLoading: createTarget.isPending || updateTarget.isPending,
    isFormLoading: open && !availableEmployeesData && isLoadingEmployees,
    employees,
    totalTarget,
    years,
    fields: months || [],
    getMonthName,
    setAllMonthsTarget,
    handleNext,
    handleFormSubmit,
    onInvalid,
  };
}
