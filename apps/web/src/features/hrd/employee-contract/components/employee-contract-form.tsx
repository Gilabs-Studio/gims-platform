"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, CalendarIcon } from "lucide-react";
import { getEmployeeContractSchema, type EmployeeContractFormData } from "../schemas/employee-contract.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatDate } from "@/lib/utils";
import { useCreateEmployeeContract, useUpdateEmployeeContract, useEmployeeContract, useEmployeeContractFormData } from "../hooks/use-employee-contracts";
import { toast } from "sonner";
import { format } from "date-fns";

interface EmployeeContractFormProps {
  readonly contractId?: string | null;
  readonly onClose: () => void;
}

export function EmployeeContractForm({ contractId, onClose }: EmployeeContractFormProps) {
  const isEdit = !!contractId;
  const t = useTranslations("employeeContract");
  const createContract = useCreateEmployeeContract();
  const updateContract = useUpdateEmployeeContract();

  // Fetch contract details if editing
  const { data: contractResponse, isLoading: isLoadingContract } = useEmployeeContract(
    contractId ?? "",
    { enabled: isEdit }
  );
  const contract = contractResponse?.data;

  // Fetch form data (employees, types, statuses)
  const { data: formDataResponse, isLoading: isLoadingFormData } = useEmployeeContractFormData();
  const formData = formDataResponse?.data;
  const employees = formData?.employees ?? [];

  const schema = getEmployeeContractSchema(t);
  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
    setValue,
    reset,
  } = useForm<EmployeeContractFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: "",
      contract_number: "",
      contract_type: undefined,
      start_date: "",
      end_date: undefined,
      salary: 0,
      job_title: "",
      department: undefined,
      terms: undefined,
      document_path: undefined,
      status: "ACTIVE",
    },
  });

  // If employee_id is stored as label (e.g. "EMP-002 - Manager User"), normalize to UUID so validation passes
  const employeeIdValue = useWatch({ control, name: "employee_id" });
  useEffect(() => {
    if (!employeeIdValue || typeof employeeIdValue !== "string" || employees.length === 0) return;
    const s = employeeIdValue.trim();
    const isUuid = employees.some((e) => String(e.id) === s);
    if (isUuid) return; // already UUID
    const byLabel = employees.find((e) => `${e.employee_code} - ${e.name}` === s);
    if (byLabel) {
      setValue("employee_id", String(byLabel.id));
    }
  }, [employeeIdValue, employees, setValue]);

  // Reset form when contract loads in edit mode so employee_id and other fields are filled
  useEffect(() => {
    if (!isEdit || !contract) return;
    reset({
      employee_id: contract.employee_id != null ? String(contract.employee_id) : "",
      contract_number: contract.contract_number ?? "",
      contract_type: contract.contract_type,
      start_date: contract.start_date ?? "",
      end_date: contract.end_date ?? undefined,
      salary: contract.salary ?? 0,
      job_title: contract.job_title ?? "",
      department: contract.department ?? undefined,
      terms: contract.terms ?? undefined,
      document_path: contract.document_path ?? undefined,
      status: contract.status ?? "ACTIVE",
    });
  }, [isEdit, contract, reset]);

  // Use useWatch instead of watch to avoid React Compiler warning
  const contractType = useWatch({ control, name: "contract_type" });

  // Auto-clear end_date when contract_type is PERMANENT
  useEffect(() => {
    if (contractType === "PERMANENT") {
      setValue("end_date", undefined);
    }
  }, [contractType, setValue]);

  const onSubmit = async (data: EmployeeContractFormData) => {
    try {
      // Ensure employee_id is always the UUID (in case it was stored as label anywhere)
      const employeeId =
        employees.find((e) => String(e.id) === data.employee_id)?.id ??
        employees.find((e) => `${e.employee_code} - ${e.name}` === data.employee_id)?.id ??
        data.employee_id;
      const payload = { ...data, employee_id: String(employeeId), end_date: data.end_date || undefined };

      if (isEdit && contractId) {
        await updateContract.mutateAsync({
          id: contractId,
          data: payload,
        });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createContract.mutateAsync(payload);
        toast.success(t("messages.createSuccess"));
      }
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t(isEdit ? "messages.updateError" : "messages.createError"));
    }
  };

  const isPending = createContract.isPending || updateContract.isPending;
  const isLoading = isLoadingContract || isLoadingFormData;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("titles.edit") : t("titles.create")}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee */}
            <Field>
              <FieldLabel>{t("fields.employee")}</FieldLabel>
              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => {
                  // Normalize: ensure we always store UUID. Radix passes item value; if we ever get label, resolve to id.
                  const normalizedValue = field.value ? String(field.value).trim() : "";
                  const displayValue =
                    normalizedValue && employees.some((e) => String(e.id) === normalizedValue)
                      ? normalizedValue
                      : employees.find((e) => `${e.employee_code} - ${e.name}` === normalizedValue)?.id ?? normalizedValue;
                  // Always pass a string so Select stays controlled (avoids "uncontrolled to controlled" warning).
                  const selectValue = typeof displayValue === "string" ? displayValue : "";
                  return (
                  <Select
                    value={selectValue}
                    onValueChange={(val) => {
                      const id =
                        employees.find((e) => String(e.id) === val) !== undefined
                          ? val
                          : employees.find((e) => `${e.employee_code} - ${e.name}` === val)?.id ?? val;
                      field.onChange(typeof id === "string" ? id : String(id));
                    }}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("fields.employeePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={String(employee.id)}>
                          {employee.employee_code} - {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  );
                }}
              />
              {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
            </Field>

            {/* Contract Number */}
            <Field>
              <FieldLabel>{t("fields.contractNumber")}</FieldLabel>
              <Input
                {...register("contract_number")}
                placeholder={t("fields.contractNumberPlaceholder")}
              />
              {errors.contract_number && <FieldError>{errors.contract_number.message}</FieldError>}
            </Field>

            {/* Contract Type */}
            <Field>
              <FieldLabel>{t("fields.contractType")}</FieldLabel>
              <Controller
                name="contract_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("fields.contractTypePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERMANENT">{t("contractType.PERMANENT")}</SelectItem>
                      <SelectItem value="CONTRACT">{t("contractType.CONTRACT")}</SelectItem>
                      <SelectItem value="INTERNSHIP">{t("contractType.INTERNSHIP")}</SelectItem>
                      <SelectItem value="PROBATION">{t("contractType.PROBATION")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.contract_type && <FieldError>{errors.contract_type.message}</FieldError>}
            </Field>

            {/* Salary */}
            <Field>
              <FieldLabel>{t("fields.salary")}</FieldLabel>
              <Controller
                name="salary"
                control={control}
                render={({ field }) => (
                  <NumericInput
                    value={field.value}
                    onChange={(value) => field.onChange(value || 0)}
                    placeholder={t("fields.salaryPlaceholder")}
                  />
                )}
              />
              {errors.salary && <FieldError>{errors.salary.message}</FieldError>}
            </Field>

            {/* Start Date */}
            <Field>
              <FieldLabel>{t("fields.startDate")}</FieldLabel>
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDate(field.value) : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.start_date && <FieldError>{errors.start_date.message}</FieldError>}
            </Field>

            {/* End Date */}
            <Field>
              <FieldLabel>
                {t("fields.endDate")}
                {contractType === "PERMANENT" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({t("messages.permanentInfo")})
                  </span>
                )}
              </FieldLabel>
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={contractType === "PERMANENT"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDate(field.value) : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.end_date && <FieldError>{errors.end_date.message}</FieldError>}
            </Field>

            {/* Job Title */}
            <Field>
              <FieldLabel>{t("fields.jobTitle")}</FieldLabel>
              <Input
                {...register("job_title")}
                placeholder={t("fields.jobTitlePlaceholder")}
              />
              {errors.job_title && <FieldError>{errors.job_title.message}</FieldError>}
            </Field>

            {/* Department */}
            <Field>
              <FieldLabel>{t("fields.department")}</FieldLabel>
              <Input
                {...register("department")}
                placeholder={t("fields.departmentPlaceholder")}
              />
              {errors.department && <FieldError>{errors.department.message}</FieldError>}
            </Field>
          </div>

          {/* Terms */}
          <Field>
            <FieldLabel>{t("fields.terms")}</FieldLabel>
            <Textarea
              {...register("terms")}
              placeholder={t("fields.termsPlaceholder")}
              rows={4}
            />
            {errors.terms && <FieldError>{errors.terms.message}</FieldError>}
          </Field>
          {/* Document Upload */}
          <Field>
            <FieldLabel>{t("fields.document")}</FieldLabel>
            <Controller
              name="document_path"
              control={control}
              render={({ field }) => (
                <FileUpload
                  value={field.value}
                  onChange={field.onChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  maxSize={10}
                  placeholder={t("fields.documentPlaceholder")}
                  uploadEndpoint="/upload/document"
                />
              )}
            />
            {errors.document_path && <FieldError>{errors.document_path.message}</FieldError>}
          </Field>

          {/* Status */}
          {isEdit && (
            <Field>
              <FieldLabel>{t("fields.status")}</FieldLabel>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                      <SelectItem value="EXPIRED">{t("status.EXPIRED")}</SelectItem>
                      <SelectItem value="TERMINATED">{t("status.TERMINATED")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <FieldError>{errors.status.message}</FieldError>}
            </Field>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? t("common.saving") : isEdit ? t("buttons.updateContract") : t("buttons.saveContract")}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
