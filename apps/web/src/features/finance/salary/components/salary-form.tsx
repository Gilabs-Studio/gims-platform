"use client";
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Loader2,
  User,
  DollarSign,
  FileText,
  CalendarIcon,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { salarySchema, type SalaryFormValues } from "../schemas/salary.schema";
import type { SalaryStructure } from "../types";
import {
  useCreateFinanceSalary,
  useUpdateFinanceSalary,
  useFinanceSalaryFormData,
} from "../hooks/use-finance-salary";

type Props = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: "create" | "edit";
  readonly initialData?: SalaryStructure | null;
  readonly defaultEmployeeId?: string;
};

export function SalaryForm({
  open,
  onOpenChange,
  mode,
  initialData,
  defaultEmployeeId,
}: Props) {
  const t = useTranslations("financeSalary");

  const createMutation = useCreateFinanceSalary();
  const updateMutation = useUpdateFinanceSalary();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { data: formDataRes, isLoading: formDataLoading } =
    useFinanceSalaryFormData();
  const employees = formDataRes?.data?.employees ?? [];

  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      employee_id: "",
      effective_date: format(new Date(), "yyyy-MM-dd"),
      basic_salary: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        employee_id: initialData?.employee_id ?? defaultEmployeeId ?? "",
        effective_date: initialData?.effective_date
          ? format(new Date(initialData.effective_date), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        basic_salary: initialData?.basic_salary ?? 0,
        notes: initialData?.notes ?? "",
      });
    }
  }, [open, initialData, defaultEmployeeId, form]);

  const watchedEmployeeId = form.watch("employee_id");
  const effectiveDateValue = form.watch("effective_date");

  const selectedEmployee = employees.find((e) => e.id === watchedEmployeeId);
  const parsedDate = effectiveDateValue
    ? new Date(effectiveDateValue + "T00:00:00")
    : undefined;

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        form.setValue("effective_date", format(date, "yyyy-MM-dd"), {
          shouldValidate: true,
        });
        setCalendarOpen(false);
      }
    },
    [form]
  );

  const onSubmit = async (values: SalaryFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          employee_id: values.employee_id,
          effective_date: values.effective_date,
          basic_salary: values.basic_salary,
          notes: values.notes ?? "",
        });
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({
          id,
          data: {
            employee_id: values.employee_id,
            effective_date: values.effective_date,
            basic_salary: values.basic_salary,
            notes: values.notes ?? "",
          },
        });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("form.createTitle") : t("form.editTitle")}
          </DialogTitle>
          <DialogDescription className="opacity-50">
            {mode === "create"
              ? t("form.description")
              : t("form.editDescription")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          {/* Employee Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                {t("form.sections.employee")}
              </h3>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.employee")} *</Label>
              <Controller
                control={form.control}
                name="employee_id"
                render={({ field, fieldState }) => (
                  <div>
                    <Popover
                      open={employeePopoverOpen}
                      onOpenChange={
                        mode === "edit" ? undefined : setEmployeePopoverOpen
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={
                            isSubmitting || mode === "edit" || formDataLoading
                          }
                          aria-expanded={employeePopoverOpen}
                          className={cn(
                            "w-full justify-between font-normal cursor-pointer",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {formDataLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </span>
                          ) : selectedEmployee ? (
                            <span className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <span className="truncate">
                                {selectedEmployee.name}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({selectedEmployee.employee_code})
                              </span>
                            </span>
                          ) : (
                            t("placeholders.selectEmployee")
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search employee..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>No employee found.</CommandEmpty>
                            <CommandGroup>
                              {employees.map((emp) => (
                                <CommandItem
                                  key={emp.id}
                                  value={`${emp.name} ${emp.employee_code}`}
                                  onSelect={() => {
                                    field.onChange(emp.id);
                                    setEmployeePopoverOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="h-3 w-3 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {emp.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {emp.employee_code}
                                      </p>
                                    </div>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-2 h-4 w-4 shrink-0",
                                      field.value === emp.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {fieldState.error && (
                      <p className="text-xs text-destructive mt-1">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Salary Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                {t("form.sections.salary")}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basic_salary">
                  {t("fields.basicSalary")} *
                </Label>
                <Controller
                  control={form.control}
                  name="basic_salary"
                  render={({ field, fieldState }) => (
                    <div>
                      <NumericInput
                        id="basic_salary"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        placeholder="0"
                        prefix="Rp"
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive mt-1">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.effectiveDate")} *</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full justify-start text-left font-normal cursor-pointer",
                        !effectiveDateValue && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {parsedDate
                        ? format(parsedDate, "MMM dd, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsedDate}
                      onSelect={handleDateSelect}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.effective_date && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.effective_date.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                {t("form.sections.additional")}
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("fields.notes")}</Label>
              <Textarea
                id="notes"
                rows={3}
                disabled={isSubmitting}
                placeholder={t("placeholders.notes")}
                {...form.register("notes")}
              />
              {form.formState.errors.notes && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.notes.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? t("form.submitting") : t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
