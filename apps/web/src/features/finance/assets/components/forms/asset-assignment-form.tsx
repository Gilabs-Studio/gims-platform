"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { User, Building2, MapPin, CalendarDays, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AsyncSelect } from "@/components/ui/async-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Service import - adjust path as needed for your project structure
const employeeService = {
  list: async (params?: unknown) => ({ data: [] as EmployeeOption[] }),
};

import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";

import type { Asset } from "@/features/finance/assets/types";
import { DatePicker } from "../date-picker";

// Employee type definition
interface EmployeeLite {
  id: string;
  name: string;
  employee_code?: string;
  position?: string;
  avatar_url?: string;
}

// Schema for assignment form
export const assetAssignmentFormSchema = z.object({
  employee_id: z.string().uuid("Employee is required"),
  department_id: z.string().uuid().optional().or(z.literal("")),
  location_id: z.string().uuid().optional().or(z.literal("")),
  assignment_date: z.string().min(1, "Assignment date is required"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

export type AssetAssignmentFormValues = z.infer<
  typeof assetAssignmentFormSchema
>;

interface AssetAssignmentFormProps {
  asset?: Asset | null;
  onSubmit: (values: AssetAssignmentFormValues) => Promise<void>;
  isSubmitting?: boolean;
  isLoading?: boolean;
}

// Extended employee option with avatar
interface EmployeeOption extends EmployeeLite {
  department_id?: string;
  department_name?: string;
}

export function AssetAssignmentForm({
  asset,
  onSubmit,
  isSubmitting = false,
  isLoading = false,
}: AssetAssignmentFormProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeOption | null>(null);

  // Fetch locations for dropdown
  const { data: locationsData, isLoading: isLocationsLoading } =
    useFinanceAssetLocations({
      page: 1,
      per_page: 100,
      sort_by: "name",
      sort_dir: "asc",
    });

  // Fetch departments for dropdown
  const { data: departmentsData, isLoading: isDepartmentsLoading } =
    useDivisions({
      page: 1,
      per_page: 100,
      sort_by: "name",
      sort_dir: "asc",
    });

  const locations = locationsData?.data ?? [];
  const departments = departmentsData?.data ?? [];

  // Get today's date as default
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }, []);

  const defaultValues: AssetAssignmentFormValues = useMemo(
    () => ({
      employee_id: asset?.assigned_to_employee_id ?? "",
      department_id: asset?.department_id ?? "",
      location_id: asset?.location_id ?? "",
      assignment_date: asset?.assignment_date
        ? asset.assignment_date.slice(0, 10)
        : today,
      notes: "",
    }),
    [asset, today],
  );

  const form = useForm<AssetAssignmentFormValues>({
    resolver: zodResolver(assetAssignmentFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  // Fetch employees for async select
  const fetchEmployees = async (query: string): Promise<EmployeeOption[]> => {
    try {
      const response = await employeeService.list({
        page: 1,
        per_page: 20,
        search: query,
        is_active: true,
      });
      return (response.data ?? []).map((emp: EmployeeOption) => ({
        id: emp.id,
        name: emp.name,
        employee_code: emp.employee_code,
        position: emp.position,
        avatar_url: emp.avatar_url,
        department_id: emp.department_id,
        department_name: emp.department_name,
      }));
    } catch {
      return [];
    }
  };

  // Handle employee selection - auto-populate department
  const handleEmployeeChange = (value: string, item?: EmployeeOption) => {
    form.setValue("employee_id", value, { shouldValidate: true });
    setSelectedEmployee(item || null);

    if (item?.department_id) {
      form.setValue("department_id", item.department_id, { shouldDirty: true });
    }
  };

  // Render employee option with avatar
  const renderEmployeeOption = (employee: EmployeeOption) => (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={employee.avatar_url} alt={employee.name} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {employee.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-medium">{employee.name}</span>
        <span className="text-xs text-muted-foreground">
          {employee.employee_code && `${employee.employee_code} • `}
          {employee.position ||
            employee.department_name ||
            t("fields.noPosition")}
        </span>
      </div>
    </div>
  );

  const handleSubmit = async (values: AssetAssignmentFormValues) => {
    try {
      await onSubmit(values);
      toast.success(t("toast.assigned"));
    } catch {
      toast.error(t("toast.assignmentFailed"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Current Assignment Info */}
      {asset?.assigned_to_employee_id && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {t("fields.currentlyAssigned") || "Currently Assigned"}
                </p>
                <p className="text-xs text-amber-700">
                  {t("fields.reassignWarning") ||
                    "Assigning to a new employee will update the current assignment"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("fields.assignTo") || "Assign To"}
        </h3>

        <Field>
          <FieldLabel>{t("fields.employee")} *</FieldLabel>
          <Controller
            name="employee_id"
            control={form.control}
            render={({ field }) => (
              <AsyncSelect
                fetcher={fetchEmployees}
                renderOption={renderEmployeeOption}
                getLabel={(emp) => emp.name}
                getValue={(emp) => emp.id}
                value={field.value}
                onChange={(value, item) =>
                  handleEmployeeChange(value, item as EmployeeOption)
                }
                label={t("fields.employee")}
                placeholder={
                  t("placeholders.searchEmployee") ||
                  "Search employee by name or code..."
                }
                emptyMessage={t("messages.noEmployees") || "No employees found"}
              />
            )}
          />
          {form.formState.errors.employee_id && (
            <FieldError>{form.formState.errors.employee_id.message}</FieldError>
          )}
        </Field>

        {/* Selected Employee Card */}
        {selectedEmployee && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={selectedEmployee.avatar_url}
                    alt={selectedEmployee.name}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedEmployee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{selectedEmployee.name}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    {selectedEmployee.employee_code && (
                      <span>
                        {t("fields.employeeCode")}:{" "}
                        {selectedEmployee.employee_code}
                      </span>
                    )}
                    {selectedEmployee.position && (
                      <span>
                        {t("fields.position")}: {selectedEmployee.position}
                      </span>
                    )}
                    {selectedEmployee.department_name && (
                      <span>
                        {t("fields.department")}:{" "}
                        {selectedEmployee.department_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Department & Location */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("fields.assignmentDetails") || "Assignment Details"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Department */}
          <Field>
            <FieldLabel>
              <Building2 className="h-4 w-4 inline mr-1" />
              {t("fields.department")}
            </FieldLabel>
            <Controller
              name="department_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                  disabled={isDepartmentsLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectDepartment") ||
                        "Select department"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">
                      {tCommon("none") || "None"}
                    </SelectItem>
                    {departments.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="cursor-pointer"
                      >
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("fields.autoPopulatedFromEmployee") ||
                "Auto-populated when employee is selected"}
            </p>
          </Field>

          {/* Location */}
          <Field>
            <FieldLabel>
              <MapPin className="h-4 w-4 inline mr-1" />
              {t("fields.location")}
            </FieldLabel>
            <Controller
              name="location_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                  disabled={isLocationsLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectLocation") || "Select location"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current" className="cursor-pointer">
                      {t("fields.keepCurrentLocation") ||
                        "Keep Current Location"}
                    </SelectItem>
                    <SelectItem value="none" className="cursor-pointer">
                      {tCommon("none") || "None"}
                    </SelectItem>
                    {locations.map((l) => (
                      <SelectItem
                        key={l.id}
                        value={l.id}
                        className="cursor-pointer"
                      >
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        {/* Assignment Date */}
        <Field>
          <FieldLabel>
            <CalendarDays className="h-4 w-4 inline mr-1" />
            {t("fields.assignmentDate")} *
          </FieldLabel>
          <Controller
            name="assignment_date"
            control={form.control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder={
                  t("placeholders.selectDate") || "Select assignment date"
                }
              />
            )}
          />
          {form.formState.errors.assignment_date && (
            <FieldError>
              {form.formState.errors.assignment_date.message}
            </FieldError>
          )}
        </Field>
      </div>

      {/* Notes */}
      <div className="space-y-4 pt-4 border-t">
        <Field>
          <FieldLabel>
            <FileText className="h-4 w-4 inline mr-1" />
            {t("fields.notes")}
          </FieldLabel>
          <Controller
            name="notes"
            control={form.control}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder={
                  t("placeholders.assignmentNotes") ||
                  "Enter assignment notes, condition of asset, etc."
                }
                rows={4}
                maxLength={500}
              />
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{t("fields.optional")}</span>
            <span>{(form.watch("notes") || "").length}/500</span>
          </div>
          {form.formState.errors.notes && (
            <FieldError>{form.formState.errors.notes.message}</FieldError>
          )}
        </Field>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isValid}
          className="cursor-pointer"
        >
          {isSubmitting
            ? tCommon("assigning")
            : asset?.assigned_to_employee_id
              ? t("actions.reassign")
              : t("actions.assign")}
        </Button>
      </div>
    </form>
  );
}
