"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { Loader2, Calculator } from "lucide-react";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import type { EmployeeSalesTarget } from "../types";
import { useSalesTargetForm } from "../hooks/use-sales-target-form";

interface SalesTargetFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target?: EmployeeSalesTarget | null;
}

export function SalesTargetForm({ open, onClose, target }: SalesTargetFormProps) {
  const [applyAllValue, setApplyAllValue] = useState<string>("");

  const {
    form,
    t,
    isEdit,
    activeTab,
    setActiveTab,
    isLoading,
    isFormLoading,
    employees,
    fields,
    totalTarget,
    years,
    getMonthName,
    setAllMonthsTarget,
    handleNext,
    handleFormSubmit,
    onInvalid,
  } = useSalesTargetForm({ target, open, onClose });

  const { register, handleSubmit, control, formState: { errors } } = form;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === "months" ? "months" : "basic")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t("common.basicInfo")}</TabsTrigger>
              <TabsTrigger value="months">{t("monthlyBreakdown")}</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-6 mt-4">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("employee")} *</FieldLabel>
                    <Controller
                      name="employee_id"
                      control={control}
                      render={({ field }) => (
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          disabled={isEdit} // Cannot change employee once created
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectEmployee")} />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} {emp.employee_code ? `(#${emp.employee_code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("year")} *</FieldLabel>
                    <Controller
                      name="year"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          disabled={isEdit} // Cannot change year once created
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectYear")} />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y.toString()}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.year && <FieldError>{errors.year.message}</FieldError>}
                  </Field>
                  
                  <Field orientation="vertical" className="col-span-2">
                     <FieldLabel>{t("totalTarget")}</FieldLabel>
                     <div className="text-2xl font-bold px-3 py-2 border rounded-md bg-muted/50">
                        {formatCurrency(totalTarget || 0)}
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">
                       {t("totalCalculatedFromMonths")}
                     </p>
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("notes")}</FieldLabel>
                    <Textarea {...register("notes")} rows={3} />
                    {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                  </Field>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button type="button" onClick={handleNext} className="cursor-pointer">
                      {t("common.next")}
                    </Button>
                </div>
              </TabsContent>

              <TabsContent value="months" className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]">
                    <Field orientation="vertical">
                      <FieldLabel>{t("applyAllTarget")}</FieldLabel>
                      <NumericInput
                        value={applyAllValue === "" ? 0 : Number(applyAllValue)}
                        onChange={(value) => setApplyAllValue(String(value ?? 0))}
                        min={0}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => setAllMonthsTarget(Number(applyAllValue || 0))}
                    >
                      {t("applyAll")}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {fields.map((field, index) => (
                        <div key={field.month} className="p-4 border rounded-lg space-y-3 bg-card">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">
                                    {getMonthName(index + 1)}
                                </span>
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Field orientation="vertical">
                                <FieldLabel>{t("targetAmount")}</FieldLabel>
                                <Controller
                                    name={`months.${index}.target_amount`}
                                    control={control}
                                    render={({ field }) => (
                                        <NumericInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            min={0}
                                        />
                                    )}
                                />
                            </Field>
                             <Field orientation="vertical">
                                <FieldLabel>{t("notes")}</FieldLabel>
                                <Controller
                                    name={`months.${index}.notes`}
                                    control={control}
                                    render={({ field }) => (
                                        <Textarea
                                            {...field}
                                            rows={2}
                                            placeholder={t("monthNotesPlaceholder")}
                                            className="resize-none"
                                        />
                                    )}
                                />
                            </Field>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                    {t("common.back")}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="cursor-pointer">
                    <ButtonLoading loading={isLoading}>{t("common.save")}</ButtonLoading>
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
