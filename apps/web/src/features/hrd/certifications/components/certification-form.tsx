"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, CalendarIcon } from "lucide-react";
import { getCertificationSchema } from "../schemas/certification.schema";
import type { CreateCertificationData, UpdateCertificationData, EmployeeCertification } from "../types";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, sortOptions } from "@/lib/utils";
import { format } from "date-fns";
import { useCreateCertification, useUpdateCertification, useCertificationFormData } from "../hooks/use-certification";
import { toast } from "sonner";

interface CertificationFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly certification?: EmployeeCertification | null;
}

export function CertificationForm({ open, onClose, certification }: CertificationFormProps) {
  const isEdit = !!certification;
  const t = useTranslations("certification");
  const createCertification = useCreateCertification();
  const updateCertification = useUpdateCertification();

  // Fetch form data (employees dropdown)
  const { data: formData } = useCertificationFormData();

  const employees = useMemo(() => {
    const data = formData?.data?.employees ?? [];
    return sortOptions(data, (a) => `${a.employee_code} - ${a.name}`);
  }, [formData?.data?.employees]);

  const schema = getCertificationSchema(t);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateCertificationData | UpdateCertificationData>({
    resolver: zodResolver(isEdit ? schema.certificationUpdate : schema.certification),
    defaultValues: certification
      ? {
          certificate_name: certification.certificate_name,
          issued_by: certification.issued_by,
          issue_date: certification.issue_date,
          expiry_date: certification.expiry_date ?? undefined,
          certificate_number: certification.certificate_number ?? undefined,
          certificate_file: certification.certificate_file ?? undefined,
          description: certification.description ?? undefined,
        }
      : {
          employee_id: "",
          certificate_name: "",
          issued_by: "",
          issue_date: new Date().toISOString().split("T")[0],
          expiry_date: undefined,
        },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is safe here for simple value observation
  const hasExpiry = watch("expiry_date");

  // Reset form when dialog opens/closes or certification changes
  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    if (certification) {
      reset({
        certificate_name: certification.certificate_name,
        issued_by: certification.issued_by,
        issue_date: certification.issue_date,
        expiry_date: certification.expiry_date ?? undefined,
        certificate_number: certification.certificate_number ?? undefined,
        certificate_file: certification.certificate_file ?? undefined,
        description: certification.description ?? undefined,
      });
    } else {
      reset({
        employee_id: "",
        certificate_name: "",
        issued_by: "",
        issue_date: new Date().toISOString().split("T")[0],
        expiry_date: undefined,
      });
    }
  }, [open, certification, reset]);

  const onSubmit = async (data: CreateCertificationData | UpdateCertificationData) => {
    try {
      if (isEdit && certification) {
        await updateCertification.mutateAsync({
          id: certification.id,
          data: data as UpdateCertificationData,
        });
        toast.success(t("success.updated"));
      } else {
        await createCertification.mutateAsync(data as CreateCertificationData);
        toast.success(t("success.created"));
      }
      onClose();
    } catch {
      toast.error(isEdit ? t("error.update") : t("error.create"));
    }
  };

  const isSubmitting = createCertification.isPending || updateCertification.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? t("form.edit_title") : t("form.create_title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee Selection (Create Only) */}
          {!isEdit && (
            <Field>
              <Label>{t("field.employee")} <span className="text-destructive">*</span></Label>
              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- employee_id only exists in create mode union type */}
                    <SelectTrigger className={cn((errors as any).employee_id && "border-destructive")}>
                      <SelectValue placeholder={t("form.select_employee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.employee_code} - {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- employee_id only exists in create mode union type */}
              {(errors as any).employee_id && <FieldError>{(errors as any).employee_id.message}</FieldError>}
            </Field>
          )}

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

          {/* Certificate File Path */}
          <Field>
            <Label>{t("field.certificate_file")}</Label>
            <Input
              {...register("certificate_file")}
              placeholder={t("form.certificate_file_placeholder")}
              disabled={isSubmitting}
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
      </DialogContent>
    </Dialog>
  );
}
