"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, CalendarIcon } from "lucide-react";
import { getCertificationSchema } from "../schemas/certification.schema";
import type { CreateCertificationData, UpdateCertificationData } from "../types";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileUpload } from "@/components/ui/file-upload";
import { cn, sortOptions } from "@/lib/utils";
import { format } from "date-fns";
import { useCreateCertification, useUpdateCertification, useCertificationFormData, useCertification } from "../hooks/use-certification";
import { toast } from "sonner";

type FormValues = CreateCertificationData | (UpdateCertificationData & { employee_id?: string });

interface CertificationFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly certificationId?: string | null;
}

export function CertificationForm({ open, onClose, certificationId }: CertificationFormProps) {
  const isEdit = !!certificationId;
  const t = useTranslations("certification");
  const createCertification = useCreateCertification();
  const updateCertification = useUpdateCertification();

  const { data: formDataResponse, isLoading: isLoadingFormData } = useCertificationFormData();
  const formData = formDataResponse?.data;
  const employees = useMemo(() => {
    const data = formData?.employees ?? [];
    return sortOptions(data, (a) => `${a.employee_code} - ${a.name}`);
  }, [formData?.employees]);

  const { data: certificationResponse, isLoading: isLoadingCertification } = useCertification(
    certificationId ?? "",
    { enabled: isEdit && !!formData }
  );
  const certification = certificationResponse?.data;

  const schema = getCertificationSchema(t);
  const [certificateFileDisplay, setCertificateFileDisplay] = useState<string | undefined>(undefined);
  const certificateDisplayClearedRef = useRef(false);
  const lastResetCertId = useRef<string | null>(null);
  const [hasFormBeenInitialized, setHasFormBeenInitialized] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? schema.certificationUpdate : schema.certification),
    defaultValues: {
      employee_id: "",
      certificate_name: "",
      issued_by: "",
      issue_date: new Date().toISOString().split("T")[0],
      expiry_date: undefined,
      certificate_number: undefined,
      certificate_file: undefined,
      description: undefined,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is safe here for simple value observation
  const hasExpiry = watch("expiry_date");

  // Normalize employee_id to UUID when user selects by label (create mode)
  const employeeIdValue = useWatch({ control, name: "employee_id", defaultValue: "" });
  useEffect(() => {
    if (!employeeIdValue || typeof employeeIdValue !== "string" || employees.length === 0) return;
    const byId = employees.find((e) => String(e.id) === employeeIdValue);
    if (byId) return;
    const byLabel = employees.find((e) => `${e.employee_code} - ${e.name}` === employeeIdValue);
    if (byLabel) setValue("employee_id", String(byLabel.id), { shouldValidate: true });
  }, [employeeIdValue, employees, setValue]);

  useEffect(() => {
    if (!open) {
      lastResetCertId.current = null;
      certificateDisplayClearedRef.current = false;
      setCertificateFileDisplay(undefined);
      setHasFormBeenInitialized(false);
      return;
    }
    if (!isEdit) {
      setHasFormBeenInitialized(true);
      setCertificateFileDisplay(undefined);
      return;
    }
    setHasFormBeenInitialized(false);
  }, [open, isEdit]);

  // Reset form when full certification loads in edit mode (same pattern as employee contract form)
  useEffect(() => {
    if (!isEdit || !certificationId || !certification) return;
    if (lastResetCertId.current === certificationId) return;
    lastResetCertId.current = certificationId;
    certificateDisplayClearedRef.current = false;
    reset({
      employee_id: certification.employee_id ?? "",
      certificate_name: certification.certificate_name ?? "",
      issued_by: certification.issued_by ?? "",
      issue_date: certification.issue_date ?? new Date().toISOString().split("T")[0],
      expiry_date: certification.expiry_date ?? undefined,
      certificate_number: certification.certificate_number ?? undefined,
      certificate_file: certification.certificate_file ?? undefined,
      description: certification.description ?? undefined,
    });
    setCertificateFileDisplay(certification.certificate_file ?? undefined);
    setHasFormBeenInitialized(true);
  }, [isEdit, certificationId, certification, reset]);

  // Create mode: reset to empty when dialog opens for create
  useEffect(() => {
    if (open && !isEdit) {
      reset({
        employee_id: "",
        certificate_name: "",
        issued_by: "",
        issue_date: new Date().toISOString().split("T")[0],
        expiry_date: undefined,
        certificate_number: undefined,
        certificate_file: undefined,
        description: undefined,
      });
      setCertificateFileDisplay(undefined);
    }
  }, [open, isEdit, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit && certification) {
        const updateData: UpdateCertificationData = {
          certificate_name: data.certificate_name,
          issued_by: data.issued_by,
          issue_date: data.issue_date,
          expiry_date: data.expiry_date ?? null,
          certificate_number: data.certificate_number ?? null,
          certificate_file: data.certificate_file ?? null,
          description: data.description ?? null,
        };
        await updateCertification.mutateAsync({
          id: certification.id,
          data: updateData,
        });
        toast.success(t("success.updated"));
      } else {
        const employeeId =
          employees.find((e) => String(e.id) === (data as CreateCertificationData).employee_id)?.id ??
          employees.find((e) => `${e.employee_code} - ${e.name}` === (data as CreateCertificationData).employee_id)?.id ??
          (data as CreateCertificationData).employee_id;
        await createCertification.mutateAsync({
          ...(data as CreateCertificationData),
          employee_id: String(employeeId),
        });
        toast.success(t("success.created"));
      }
      onClose();
    } catch {
      toast.error(isEdit ? t("error.update") : t("error.create"));
    }
  };

  const isSubmitting = createCertification.isPending || updateCertification.isPending;
  const isFormReady =
    !isLoadingFormData &&
    (!isEdit || (!!certification && !isLoadingCertification && hasFormBeenInitialized));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? t("form.edit_title") : t("form.create_title")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("form.edit_title") : t("form.create_title")}
          </DialogDescription>
        </DialogHeader>

        {!isFormReady ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee: required in create, read-only in edit (same as employee contract form) */}
          <Field>
            <Label>{t("field.employee")} {!isEdit && <span className="text-destructive">*</span>}</Label>
            <Controller
              name="employee_id"
              control={control}
              render={({ field }) => {
                const normalizedValue =
                  typeof field.value === "string" && field.value
                    ? employees.find((e) => String(e.id) === field.value)
                      ? field.value
                      : employees.find((e) => `${e.employee_code} - ${e.name}` === field.value)?.id ?? field.value
                    : "";
                return (
                  <Select
                    value={String(normalizedValue)}
                    onValueChange={field.onChange}
                    disabled={isSubmitting || isEdit}
                  >
                    <SelectTrigger className={cn("employee_id" in errors && errors.employee_id && "border-destructive")}>
                      <SelectValue placeholder={t("form.select_employee")} />
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
            {!isEdit && "employee_id" in errors && errors.employee_id != null && (
              <FieldError>{errors.employee_id.message}</FieldError>
            )}
          </Field>

          {/* Certificate Name */}
          <Field>
            <Label>{t("field.certificate_name")} <span className="text-destructive">*</span></Label>
            <Input
              {...register("certificate_name")}
              placeholder={t("form.certificate_name_placeholder")}
              disabled={isSubmitting}
              className={cn(errors.certificate_name && "border-destructive")}
            />
            {errors.certificate_name && <FieldError>{errors.certificate_name.message}</FieldError>}
          </Field>

          {/* Issued By */}
          <Field>
            <Label>{t("field.issued_by")} <span className="text-destructive">*</span></Label>
            <Input
              {...register("issued_by")}
              placeholder={t("form.issued_by_placeholder")}
              disabled={isSubmitting}
              className={cn(errors.issued_by && "border-destructive")}
            />
            {errors.issued_by && <FieldError>{errors.issued_by.message}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {/* Issue Date */}
            <Field>
              <Label>{t("field.issue_date")} <span className="text-destructive">*</span></Label>
              <Controller
                name="issue_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !field.value && "text-muted-foreground",
                          errors.issue_date && "border-destructive"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "dd MMM yyyy") : <span>{t("form.pick_date")}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.issue_date && <FieldError>{errors.issue_date.message}</FieldError>}
            </Field>

            {/* Expiry Date */}
            <Field>
              <Label>{t("field.expiry_date")}</Label>
              <Controller
                name="expiry_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !field.value && "text-muted-foreground",
                          errors.expiry_date && "border-destructive"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "dd MMM yyyy") : <span>{t("form.pick_date")}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {hasExpiry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs mt-1"
                  onClick={() => setValue("expiry_date", undefined)}
                >
                  {t("form.clear_date")}
                </Button>
              )}
              {errors.expiry_date && <FieldError>{errors.expiry_date.message}</FieldError>}
              <p className="text-xs text-muted-foreground mt-1">{t("form.expiry_date_description")}</p>
            </Field>
          </div>

          {/* Certificate Number */}
          <Field>
            <Label>{t("field.certificate_number")}</Label>
            <Input
              {...register("certificate_number")}
              placeholder={t("form.certificate_number_placeholder")}
              disabled={isSubmitting}
            />
          </Field>

          {/* Certificate File Upload (same as HRD contracts) */}
          <Field>
            <Label>{t("field.certificate_file")}</Label>
            <Controller
              name="certificate_file"
              control={control}
              render={({ field }) => {
                const fallback =
                  field.value != null && String(field.value).trim() !== ""
                    ? String(field.value)
                    : undefined;
                const displayValue = certificateDisplayClearedRef.current
                  ? undefined
                  : (certificateFileDisplay ?? fallback);
                const handleChange = (val: string | undefined) => {
                  const next = val && String(val).trim() !== "" ? val : undefined;
                  certificateDisplayClearedRef.current = false;
                  setCertificateFileDisplay(next);
                  field.onChange(next ?? null);
                };
                const handleClear = () => {
                  certificateDisplayClearedRef.current = true;
                  setCertificateFileDisplay(undefined);
                  setValue("certificate_file", undefined, { shouldDirty: true, shouldValidate: false });
                  field.onChange(undefined);
                };
                return (
                  <FileUpload
                    key={displayValue ?? "empty"}
                    value={displayValue}
                    onChange={handleChange}
                    onClear={handleClear}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    maxSize={10}
                    placeholder={t("form.certificate_file_placeholder")}
                    uploadEndpoint="/upload/document"
                  />
                );
              }}
            />
            <p className="text-xs text-muted-foreground">{t("form.certificate_file_description")}</p>
          </Field>

          {/* Description */}
          <Field>
            <Label>{t("field.description")}</Label>
            <Textarea
              {...register("description")}
              placeholder={t("form.description_placeholder")}
              className="min-h-20 resize-none"
              disabled={isSubmitting}
            />
          </Field>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : isEdit ? (
                t("common.update")
              ) : (
                t("common.create")
              )}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
