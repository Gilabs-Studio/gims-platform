"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, CalendarIcon, GraduationCap } from "lucide-react";
import {
  getEducationHistorySchema,
  type EducationHistoryFormValues,
} from "../schemas/education-history.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatDate } from "@/lib/utils";
import {
  useCreateEducationHistory,
  useUpdateEducationHistory,
  useEducationHistoryFormData,
} from "../hooks/use-education-history";
import type {
  EmployeeEducationHistory,
  CreateEducationHistoryData,
  UpdateEducationHistoryData,
} from "../types";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface EducationHistoryFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly educationHistory?: EmployeeEducationHistory | null;
}

export function EducationHistoryForm({
  open,
  onClose,
  educationHistory,
}: EducationHistoryFormProps) {
  const isEdit = !!educationHistory;
  const t = useTranslations("educationHistory");
  const createEducation = useCreateEducationHistory();
  const updateEducation = useUpdateEducationHistory();
  const [isOngoing, setIsOngoing] = useState(
    isEdit ? !educationHistory?.end_date : false
  );

  // Fetch form data (employees + degree levels)
  const { data: formData, isLoading: isLoadingFormData } =
    useEducationHistoryFormData();

  const schema = getEducationHistorySchema(t);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EducationHistoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: educationHistory
      ? {
          employee_id: educationHistory.employee_id,
          institution: educationHistory.institution,
          degree: educationHistory.degree,
          field_of_study: educationHistory.field_of_study || "",
          start_date: educationHistory.start_date,
          end_date: educationHistory.end_date || undefined,
          gpa: educationHistory.gpa || undefined,
          description: educationHistory.description || "",
          document_path: educationHistory.document_path || "",
        }
      : {
          employee_id: "",
          institution: "",
          degree: "BACHELOR",
          field_of_study: "",
          start_date: "",
          end_date: undefined,
          gpa: undefined,
          description: "",
          document_path: "",
        },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      // Reset ongoing state after a brief delay to avoid setState in effect
      setTimeout(() => setIsOngoing(false), 0);
    }
  }, [open, reset]);

  // Handle ongoing education checkbox
  useEffect(() => {
    if (isOngoing) {
      setValue("end_date", undefined);
    }
  }, [isOngoing, setValue]);

  const onSubmit = async (data: EducationHistoryFormValues) => {
    try {
      const submitData: CreateEducationHistoryData = {
        employee_id: data.employee_id,
        institution: data.institution,
        degree: data.degree,
        start_date: data.start_date,
        end_date: isOngoing ? undefined : (data.end_date || undefined),
        gpa: data.gpa || undefined,
        field_of_study: data.field_of_study || "",
        description: data.description || "",
        document_path: data.document_path || "",
      };

      if (isEdit && educationHistory) {
        const updateData: UpdateEducationHistoryData = {
          institution: submitData.institution,
          degree: submitData.degree,
          field_of_study: submitData.field_of_study,
          start_date: submitData.start_date,
          end_date: submitData.end_date,
          gpa: submitData.gpa,
          description: submitData.description,
          document_path: submitData.document_path,
        };
        await updateEducation.mutateAsync({
          id: educationHistory.id,
          data: updateData,
        });
        toast.success(t("updated"));
      } else {
        await createEducation.mutateAsync(submitData);
        toast.success(t("created"));
      }
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const employees = formData?.data?.employees ?? [];
  const degreeLevels = formData?.data?.degree_levels ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {isEdit ? t("edit") : t("add")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Selection */}
          <Field>
            <Label>{t("employee")} <span className="text-destructive">*</span></Label>
            <Controller
              name="employee_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEdit || isLoadingFormData}
                >
                  <SelectTrigger
                    className={cn(errors.employee_id && "border-destructive")}
                  >
                    <SelectValue
                      placeholder={
                        isLoadingFormData
                          ? t("common.loading")
                          : t("form.selectEmployee")
                      }
                    />
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
            {errors.employee_id && (
              <FieldError>{errors.employee_id.message}</FieldError>
            )}
          </Field>

          {/* Institution */}
          <Field>
            <Label>{t("institution")} <span className="text-destructive">*</span></Label>
            <Input
              {...register("institution")}
              placeholder={t("form.institutionPlaceholder")}
              className={cn(errors.institution && "border-destructive")}
            />
            {errors.institution && (
              <FieldError>{errors.institution.message}</FieldError>
            )}
          </Field>

          {/* Degree Level */}
          <Field>
            <Label>{t("degree")} <span className="text-destructive">*</span></Label>
            <Controller
              name="degree"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={cn(errors.degree && "border-destructive")}
                  >
                    <SelectValue placeholder={t("form.selectDegree")} />
                  </SelectTrigger>
                  <SelectContent>
                    {degreeLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.degree && <FieldError>{errors.degree.message}</FieldError>}
          </Field>

          {/* Field of Study */}
          <Field>
            <FieldLabel>{t("fieldOfStudy")}</FieldLabel>
            <Input
              {...register("field_of_study")}
              placeholder={t("form.fieldOfStudyPlaceholder")}
              className={cn(errors.field_of_study && "border-destructive")}
            />
            {errors.field_of_study && (
              <FieldError>{errors.field_of_study.message}</FieldError>
            )}
          </Field>

          {/* Start Date */}
          <Field>
            <Label>{t("startDate")} <span className="text-destructive">*</span></Label>
            <Controller
              name="start_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                        errors.start_date && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? formatDate(field.value)
                        : t("common.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date: Date | undefined) =>
                        field.onChange(
                          date ? date.toISOString().split("T")[0] : ""
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.start_date && (
              <FieldError>{errors.start_date.message}</FieldError>
            )}
          </Field>

          {/* Ongoing Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ongoing"
              checked={isOngoing}
              onCheckedChange={(checked) => setIsOngoing(!!checked)}
            />
            <label
              htmlFor="ongoing"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t("form.ongoing")}
            </label>
          </div>

          {/* End Date */}
          {!isOngoing && (
            <Field>
              <FieldLabel>{t("endDate")}</FieldLabel>
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.end_date && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? formatDate(field.value)
                          : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date: Date | undefined) =>
                          field.onChange(
                            date ? date.toISOString().split("T")[0] : undefined
                          )
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.end_date && (
                <FieldError>{errors.end_date.message}</FieldError>
              )}
            </Field>
          )}

          {/* GPA */}
          <Field>
            <FieldLabel>{t("gpa")}</FieldLabel>
            <Input
              {...register("gpa", {
                setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
              })}
              type="number"
              step="0.01"
              min="0"
              max="4"
              placeholder={t("form.gpaPlaceholder")}
              className={cn(errors.gpa && "border-destructive")}
            />
            {errors.gpa && <FieldError>{errors.gpa.message}</FieldError>}
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel>{t("description")}</FieldLabel>
            <Textarea
              {...register("description")}
              placeholder={t("form.descriptionPlaceholder")}
              rows={3}
              className={cn(errors.description && "border-destructive")}
            />
            {errors.description && (
              <FieldError>{errors.description.message}</FieldError>
            )}
          </Field>

          {/* Document Path */}
          <Field>
            <FieldLabel>{t("documentPath")}</FieldLabel>
            <Input
              {...register("document_path")}
              placeholder={t("form.documentPathPlaceholder")}
              className={cn(errors.document_path && "border-destructive")}
            />
            {errors.document_path && (
              <FieldError>{errors.document_path.message}</FieldError>
            )}
          </Field>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t(isEdit ? "common.update" : "common.create")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
