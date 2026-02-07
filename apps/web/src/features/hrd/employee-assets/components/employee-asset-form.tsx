"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  assetConditionEnum,
  getEmployeeAssetSchema,
  type EmployeeAssetFormValues,
} from "../schemas/employee-asset.schema";
import type { EmployeeAsset, EmployeeFormOption } from "../types";

interface EmployeeAssetFormProps {
  asset?: EmployeeAsset | null;
  employees?: EmployeeFormOption[];
  onSubmit: (data: EmployeeAssetFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function EmployeeAssetForm({
  asset,
  employees = [],
  onSubmit,
  onCancel,
  isSubmitting,
}: EmployeeAssetFormProps) {
  const t = useTranslations("employeeAssets");
  const schema = getEmployeeAssetSchema(t);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeAssetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: asset?.employee_id ?? "",
      asset_name: asset?.asset_name ?? "",
      asset_code: asset?.asset_code ?? "",
      asset_category: asset?.asset_category ?? "",
      borrow_date: asset?.borrow_date ?? format(new Date(), "yyyy-MM-dd"),
      borrow_condition: asset?.borrow_condition ?? "GOOD",
      notes: asset?.notes ?? "",
    },
  });

  const isReturned = asset?.status === "RETURNED";

  useEffect(() => {
    if (isReturned) {
      reset();
    }
  }, [isReturned, reset]);

  const handleFormSubmit = (data: EmployeeAssetFormValues) => {
    if (isReturned) return;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Employee Selection */}
      <Field>
        <FieldLabel>{t("form.employee")} *</FieldLabel>
        <Controller
          control={control}
          name="employee_id"
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={!!asset || isReturned}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("form.employeePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{errors.employee_id?.message}</FieldError>
      </Field>

      {/* Asset Name */}
      <Field>
        <FieldLabel>{t("form.assetName")} *</FieldLabel>
        <Controller
          control={control}
          name="asset_name"
          render={({ field }) => (
            <Input
              placeholder={t("form.assetNamePlaceholder")}
              {...field}
              disabled={isReturned}
            />
          )}
        />
        <FieldError>{errors.asset_name?.message}</FieldError>
      </Field>

      {/* Asset Code */}
      <Field>
        <FieldLabel>{t("form.assetCode")} *</FieldLabel>
        <Controller
          control={control}
          name="asset_code"
          render={({ field }) => (
            <Input
              placeholder={t("form.assetCodePlaceholder")}
              {...field}
              disabled={isReturned}
            />
          )}
        />
        <FieldError>{errors.asset_code?.message}</FieldError>
      </Field>

      {/* Asset Category */}
      <Field>
        <FieldLabel>{t("form.assetCategory")} *</FieldLabel>
        <Controller
          control={control}
          name="asset_category"
          render={({ field }) => (
            <Input
              placeholder={t("form.assetCategoryPlaceholder")}
              {...field}
              disabled={isReturned}
            />
          )}
        />
        <FieldError>{errors.asset_category?.message}</FieldError>
      </Field>

      {/* Borrow Date */}
      <Field>
        <FieldLabel>{t("form.borrowDate")} *</FieldLabel>
        <Controller
          control={control}
          name="borrow_date"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={isReturned}
                >
                  {field.value ? (
                    format(new Date(field.value), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date: Date | undefined) =>
                    field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                  }
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
        <FieldError>{errors.borrow_date?.message}</FieldError>
      </Field>

      {/* Borrow Condition */}
      <Field>
        <FieldLabel>{t("form.borrowCondition")} *</FieldLabel>
        <Controller
          control={control}
          name="borrow_condition"
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isReturned}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("form.borrowConditionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {assetConditionEnum.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {t(`condition.${condition}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{errors.borrow_condition?.message}</FieldError>
      </Field>

      {/* Notes */}
      <Field>
        <FieldLabel>{t("form.notes")}</FieldLabel>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Textarea
              placeholder={t("form.notesPlaceholder")}
              {...field}
              value={field.value ?? ""}
              disabled={isReturned}
              rows={3}
            />
          )}
        />
        <FieldError>{errors.notes?.message}</FieldError>
      </Field>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("form.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || isReturned}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("form.saving")}
            </>
          ) : (
            t("form.submit")
          )}
        </Button>
      </div>
    </form>
  );
}
