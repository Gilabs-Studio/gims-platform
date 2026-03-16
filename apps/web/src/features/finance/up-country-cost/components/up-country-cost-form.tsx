"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/ui/numeric-input";

import {
  useCreateFinanceUpCountryCost,
  useUpdateFinanceUpCountryCost,
} from "../hooks/use-finance-up-country-cost";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { upCountryCostFormSchema, type UpCountryCostFormValues } from "../schemas/up-country-cost.schema";
import type { UpCountryCost } from "../types";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";

interface FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData: UpCountryCost | null;
}

const COST_TYPES = ["transport", "accommodation", "meal", "fuel", "other"] as const;

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateButtonLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabledBefore?: Date;
}

function DatePickerField({ value, onChange, placeholder, disabledBefore }: DatePickerFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal cursor-pointer",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDateButtonLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date: Date | undefined) => onChange(date ? dateToISO(date) : "")}
          disabled={disabledBefore ? (date) => date < disabledBefore : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function UpCountryCostForm({ open, onOpenChange, mode, initialData }: FormProps) {
  const t = useTranslations("financeUpCountryCost");

  const createMutation = useCreateFinanceUpCountryCost();
  const updateMutation = useUpdateFinanceUpCountryCost();

  const { data: employeesData } = useEmployees({ per_page: 500, is_active: true }, { enabled: open });
  const employeeOptions = useMemo(() => {
    return (employeesData?.data ?? []).map(emp => ({
      label: emp.name,
      value: emp.id
    }));
  }, [employeesData?.data]);

  const defaultValues: UpCountryCostFormValues = useMemo(() => {
    if (mode === "edit" && initialData) {
      return {
        purpose: initialData.purpose,
        location: initialData.location || "",
        start_date: initialData.start_date.split("T")[0],
        end_date: initialData.end_date.split("T")[0],
        notes: initialData.notes || "",
        employees: initialData.employees.map((e) => ({
          employee_id: e.employee_id,
        })),
        items: initialData.items.map((i) => ({
          cost_type: i.cost_type,
          description: i.description || "",
          amount: i.amount,
          expense_date: i.expense_date ? i.expense_date.split("T")[0] : "",
        })),
      };
    }
    return {
      purpose: "",
      location: "",
      start_date: todayISO(),
      end_date: todayISO(),
      notes: "",
      employees: [{ employee_id: "" }],
      items: [
        {
          cost_type: "transport",
          description: "",
          amount: 0,
          expense_date: todayISO(),
        },
      ],
    };
  }, [mode, initialData]);

  const form = useForm<UpCountryCostFormValues>({
    resolver: zodResolver(upCountryCostFormSchema),
    defaultValues,
  });

  const {
    fields: employeeFields,
    append: appendEmployee,
    remove: removeEmployee,
  } = useFieldArray({
    control: form.control,
    name: "employees",
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const onSubmit = async (values: UpCountryCostFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("toast.created"));
      } else if (initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: values,
        });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(t("toast.failed"));
      console.error(error);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const calculateTotal = () => {
    return form.watch("items").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };
  
  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>
            {mode === "create" ? t("form.createTitle") : t("form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t("fields.purpose")} <span className="text-destructive">*</span></Label>
                  <Input {...form.register("purpose")} />
                  {errors.purpose && <p className="text-sm text-destructive">{errors.purpose.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>{t("fields.location")}</Label>
                  <Input {...form.register("location")} />
                </div>
                
                <div className="space-y-2">
                  <Label>{t("fields.startDate")} <span className="text-destructive">*</span></Label>
                  <DatePickerField
                    value={form.watch("start_date")}
                    onChange={(value) => form.setValue("start_date", value, { shouldValidate: true })}
                    placeholder={t("filters.startDate")}
                  />
                  {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>{t("fields.endDate")} <span className="text-destructive">*</span></Label>
                  <DatePickerField
                    value={form.watch("end_date")}
                    onChange={(value) => form.setValue("end_date", value, { shouldValidate: true })}
                    placeholder={t("filters.endDate")}
                    disabledBefore={form.watch("start_date") ? new Date(form.watch("start_date")) : undefined}
                  />
                  {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
                </div>
                
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label>{t("fields.notes")}</Label>
                  <Textarea {...form.register("notes")} rows={2} />
                </div>
              </div>

              {/* Employees section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{t("fields.employees")}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendEmployee({ employee_id: "" })}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("form.addEmployee")}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {employeeFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <CreatableCombobox
                          options={employeeOptions}
                          value={form.watch(`employees.${index}.employee_id`)}
                          onValueChange={(val) => form.setValue(`employees.${index}.employee_id`, val, { shouldValidate: true })}
                          placeholder={t("form.selectEmployee")}
                        />
                        {errors.employees?.[index]?.employee_id && (
                          <p className="text-sm text-destructive">{errors.employees[index]?.employee_id?.message}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmployee(index)}
                        disabled={employeeFields.length <= 1}
                        className="mt-1 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.employees?.message && (
                    <p className="text-sm text-destructive">{errors.employees.message}</p>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{t("fields.items")}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendItem({
                        cost_type: "transport",
                        description: "",
                        amount: 0,
                        expense_date: todayISO(),
                      })
                    }
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("form.addItem")}
                  </Button>
                </div>

                <div className="rounded-md border p-1 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium w-[150px]">{t("fields.expenseDate")}</th>
                        <th className="p-3 text-left font-medium w-[150px]">{t("fields.costType")}</th>
                        <th className="p-3 text-left font-medium">{t("fields.costDescription")}</th>
                        <th className="p-3 text-right font-medium w-[150px]">{t("fields.costAmount")}</th>
                        <th className="p-3 w-[60px]" />
                      </tr>
                    </thead>
                    <tbody>
                      {itemFields.map((field, index) => (
                        <tr key={field.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-2 align-top space-y-1">
                            <DatePickerField
                              value={form.watch(`items.${index}.expense_date`) ?? ""}
                              onChange={(value) =>
                                form.setValue(`items.${index}.expense_date`, value, { shouldValidate: true })
                              }
                              placeholder={t("filters.startDate")}
                            />
                            {errors.items?.[index]?.expense_date && (
                              <p className="text-xs text-destructive">{errors.items[index]?.expense_date?.message}</p>
                            )}
                          </td>
                          <td className="p-2 align-top space-y-1">
                            <Select
                              onValueChange={(val) => form.setValue(`items.${index}.cost_type`, val as "transport" | "accommodation" | "meal" | "fuel" | "other", { shouldValidate: true })}
                              value={form.watch(`items.${index}.cost_type`)}
                            >
                              <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder={t("form.selectCostType")} />
                              </SelectTrigger>
                              <SelectContent>
                                {COST_TYPES.map((type) => (
                                  <SelectItem key={type} value={type} className="cursor-pointer">
                                    {t(`costTypes.${type}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.items?.[index]?.cost_type && (
                              <p className="text-xs text-destructive">{errors.items[index]?.cost_type?.message}</p>
                            )}
                          </td>
                          <td className="p-2 align-top space-y-1">
                            <Input {...form.register(`items.${index}.description`)} />
                            {errors.items?.[index]?.description && (
                              <p className="text-xs text-destructive">{errors.items[index]?.description?.message}</p>
                            )}
                          </td>
                          <td className="p-2 align-top space-y-1">
                            <Controller
                              control={form.control}
                              name={`items.${index}.amount`}
                              render={({ field }) => (
                                <NumericInput
                                  value={field.value}
                                  onChange={(value) => field.onChange(value ?? 0)}
                                  className="text-right"
                                />
                              )}
                            />
                            {errors.items?.[index]?.amount && (
                              <p className="text-xs text-destructive">{errors.items[index]?.amount?.message}</p>
                            )}
                          </td>
                          <td className="p-2 align-middle text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              disabled={itemFields.length <= 1}
                              className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {errors.items?.message && (
                        <tr>
                          <td colSpan={5} className="p-2 text-destructive">{errors.items.message}</td>
                        </tr>
                      )}
                      <tr className="bg-muted/50 border-t">
                        <td colSpan={3} className="p-3 text-right font-medium">
                          {t("form.total")}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-lg text-primary">
                          {formatCurrency(calculateTotal())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("form.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
