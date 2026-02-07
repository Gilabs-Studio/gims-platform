"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
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
  getReturnAssetSchema,
  type ReturnAssetFormValues,
} from "../schemas/employee-asset.schema";
import type { EmployeeAsset } from "../types";

interface ReturnAssetModalProps {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: ReturnAssetFormValues) => void;
  isSubmitting?: boolean;
}

export function ReturnAssetModal({
  asset,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: ReturnAssetModalProps) {
  const t = useTranslations("employeeAssets");
  const schema = getReturnAssetSchema(t);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReturnAssetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      return_date: format(new Date(), "yyyy-MM-dd"),
      return_condition: "GOOD",
      notes: "",
    },
  });

  const handleFormSubmit = (data: ReturnAssetFormValues) => {
    onConfirm(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        reset();
      }
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("returnModal.title")}</DialogTitle>
          <DialogDescription>{t("returnModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="mb-4 rounded-lg border bg-muted/50 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("columns.assetCode")}:</span>
              <span className="font-medium">{asset.asset_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("columns.assetName")}:</span>
              <span className="font-medium">{asset.asset_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("columns.employee")}:</span>
              <span className="font-medium">{asset.employee?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("columns.borrowDate")}:</span>
              <span className="font-medium">
                {format(new Date(asset.borrow_date), "dd MMM yyyy")}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Return Date */}
          <Field>
            <FieldLabel>{t("form.returnDate")} *</FieldLabel>
            <Controller
              control={control}
              name="return_date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
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
                        date > new Date() ||
                        date < new Date(asset.borrow_date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <FieldError>{errors.return_date?.message}</FieldError>
          </Field>

          {/* Return Condition */}
          <Field>
            <FieldLabel>{t("form.returnCondition")} *</FieldLabel>
            <Controller
              control={control}
              name="return_condition"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("form.returnConditionPlaceholder")}
                    />
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
            <FieldError>{errors.return_condition?.message}</FieldError>
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
                  rows={3}
                />
              )}
            />
            <FieldError>{errors.notes?.message}</FieldError>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("returnModal.returning")}
                </>
              ) : (
                t("returnModal.confirmReturn")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
