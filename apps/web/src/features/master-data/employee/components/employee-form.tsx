"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Shield, User } from "lucide-react";
import { cn, sortOptions } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Employee, ContractStatus, Gender, PTKPStatus, AreaAssignment } from "../types";
import { useCreateEmployee, useUpdateEmployee, useAvailableUsers, useEmployeeFormData, useBulkUpdateEmployeeAreas, useEmployee } from "../hooks/use-employees";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";
import { useJobPositions } from "@/features/master-data/organization/hooks/use-job-positions";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { ButtonLoading } from "@/components/loading";

const employeeSchema = z.object({
  employee_code: z.string().min(1, "Employee code is required").max(50),
  name: z.string().min(2, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  user_id: z.string().optional(),
  division_id: z.string().optional(),
  job_position_id: z.string().optional(),
  company_id: z.string().optional(),
  date_of_birth: z.date().optional().nullable().or(z.string().optional().nullable()),
  place_of_birth: z.string().max(100).optional(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  religion: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  nik: z.string().max(20).optional(),
  npwp: z.string().max(30).optional(),
  bpjs: z.string().max(30).optional(),
  contract_status: z.enum(["permanent", "contract", "probation", "intern"]).optional().nullable(),
  contract_start_date: z.date().optional().nullable().or(z.string().optional().nullable()),
  contract_end_date: z.date().optional().nullable().or(z.string().optional().nullable()),
  total_leave_quota: z.coerce.number().min(0).optional(),
  ptkp_status: z.enum([
    "TK/0", "TK/1", "TK/2", "TK/3",
    "K/0", "K/1", "K/2", "K/3",
    "K/I/0", "K/I/1", "K/I/2", "K/I/3"
  ]).optional().nullable(),
  is_disability: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

const CONTRACT_STATUS_OPTIONS: ContractStatus[] = ["permanent", "contract", "probation", "intern"];
const GENDER_OPTIONS: Gender[] = ["male", "female"];
const PTKP_OPTIONS: PTKPStatus[] = [
  "TK/0", "TK/1", "TK/2", "TK/3",
  "K/0", "K/1", "K/2", "K/3",
  "K/I/0", "K/I/1", "K/I/2", "K/I/3",
];

export function EmployeeForm({ open, onOpenChange, employee }: EmployeeFormProps) {
  const t = useTranslations("employee");
  const isEditing = !!employee;

  // Fetch full employee details when in edit mode
  const { data: employeeDetailData } = useEmployee(employee?.id);

  // Use detailed data if available, otherwise fall back to prop data
  const employeeData = employeeDetailData?.data || employee;

  // Area assignments state (managed separately from the main form)
  const [areaAssignments, setAreaAssignments] = useState<AreaAssignment[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  const { data: divisionsData } = useDivisions({ per_page: 100 });
  const { data: positionsData } = useJobPositions({ per_page: 100 });
  const { data: companiesData } = useCompanies({ per_page: 100 });
  const { data: availableUsersData } = useAvailableUsers(
    undefined,
    employee?.id
  );
  const { data: formDataResp } = useEmployeeFormData();

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const bulkUpdateAreas = useBulkUpdateEmployeeAreas();

  const divisions = sortOptions(divisionsData?.data ?? [], (d) => d.name);
  const positions = sortOptions(positionsData?.data ?? [], (p) => p.name);
  const companies = sortOptions(companiesData?.data ?? [], (c) => c.name);

  const availableUsers = useMemo(
    () => availableUsersData?.data ?? [],
    [availableUsersData]
  );

  // Areas from the form-data endpoint for the area assignment dropdown
  const areaOptions = useMemo(
    () => sortOptions(formDataResp?.data?.areas ?? [], (a) => a.name),
    [formDataResp]
  );

  // Filter out already-assigned areas from the dropdown
  const unassignedAreas = useMemo(
    () =>
      areaOptions.filter(
        (a) => !areaAssignments.some((aa) => aa.area_id === a.id)
      ),
    [areaOptions, areaAssignments]
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      employee_code: "",
      name: "",
      email: "",
      phone: "",
      user_id: "",
      division_id: "",
      job_position_id: "",
      company_id: "",
      date_of_birth: undefined,
      place_of_birth: "",
      gender: undefined,
      religion: "",
      address: "",
      nik: "",
      npwp: "",
      bpjs: "",
      contract_status: "permanent",
      contract_start_date: undefined,
      contract_end_date: undefined,
      total_leave_quota: 12,
      ptkp_status: undefined,
      is_disability: false,
      is_active: true,
    },
  });

  useEffect(() => {
    // Reset form when modal opens or employeeData changes
    if (!open) {
      return;
    }

    if (employeeData) {
      // Extract IDs from nested objects (API returns nested objects, not IDs)
      const divisionId = employeeData.division_id || employeeData.division?.id || "";
      const jobPositionId = employeeData.job_position_id || employeeData.job_position?.id || "";
      const companyId = employeeData.company_id || employeeData.company?.id || "";
      const userId = employeeData.user_id || employeeData.user?.id || "";

      const formData = {
        employee_code: employeeData.employee_code,
        name: employeeData.name,
        email: employeeData.email ?? "",
        phone: employeeData.phone ?? "",
        user_id: userId,
        division_id: divisionId,
        job_position_id: jobPositionId,
        company_id: companyId,
        date_of_birth: employeeData.date_of_birth ? new Date(employeeData.date_of_birth) : undefined,
        place_of_birth: employeeData.place_of_birth ?? "",
        gender: employeeData.gender ?? undefined,
        religion: employeeData.religion ?? "",
        address: employeeData.address ?? "",
        nik: employeeData.nik ?? "",
        npwp: employeeData.npwp ?? "",
        bpjs: employeeData.bpjs ?? "",
        contract_status: employeeData.contract_status ?? "permanent",
        contract_start_date: employeeData.contract_start_date ? new Date(employeeData.contract_start_date) : undefined,
        contract_end_date: employeeData.contract_end_date ? new Date(employeeData.contract_end_date) : undefined,
        total_leave_quota: employeeData.total_leave_quota ?? 12,
        ptkp_status: employeeData.ptkp_status ?? undefined,
        is_disability: employeeData.is_disability ?? false,
        is_active: employeeData.is_active,
      };
      reset(formData, {
        keepDefaultValues: false,
        keepErrors: false,
        keepDirty: false,
        keepValues: false,
        keepTouched: false,
        keepIsSubmitted: false,
        keepSubmitCount: false,
      });

      const existingAreas: AreaAssignment[] =
        employeeData.areas?.map((ea) => ({
          area_id: ea.area_id,
          is_supervisor: ea.is_supervisor,
        })) ?? [];
      setAreaAssignments(existingAreas);
    } else {
      reset({
        employee_code: "",
        name: "",
        email: "",
        phone: "",
        user_id: "",
        division_id: "",
        job_position_id: "",
        company_id: "",
        date_of_birth: undefined,
        place_of_birth: "",
        gender: undefined,
        religion: "",
        address: "",
        nik: "",
        npwp: "",
        bpjs: "",
        contract_status: "permanent",
        contract_start_date: undefined,
        contract_end_date: undefined,
        total_leave_quota: 12,
        ptkp_status: undefined,
        is_disability: false,
        is_active: true,
      });
      setAreaAssignments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id, employeeData]);

  const onSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
    try {
      const memberAreaIds = areaAssignments
        .filter((a) => !a.is_supervisor)
        .map((a) => a.area_id);
      const supervisorAreaIds = areaAssignments
        .filter((a) => a.is_supervisor)
        .map((a) => a.area_id);

      const cleanData = {
        employee_code: data.employee_code,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        user_id: data.user_id || undefined,
        division_id: data.division_id || undefined,
        job_position_id: data.job_position_id || undefined,
        company_id: data.company_id || undefined,
        date_of_birth: data.date_of_birth instanceof Date ? data.date_of_birth.toISOString() : undefined,
        place_of_birth: data.place_of_birth || undefined,
        gender: data.gender || undefined,
        religion: data.religion || undefined,
        address: data.address || undefined,
        nik: data.nik || undefined,
        npwp: data.npwp || undefined,
        bpjs: data.bpjs || undefined,
        contract_status: data.contract_status || undefined,
        contract_start_date: data.contract_start_date instanceof Date ? data.contract_start_date.toISOString() : undefined,
        contract_end_date: data.contract_end_date instanceof Date ? data.contract_end_date.toISOString() : undefined,
        total_leave_quota: data.total_leave_quota,
        ptkp_status: data.ptkp_status || undefined,
        is_disability: data.is_disability,
        is_active: data.is_active,
        area_ids: memberAreaIds,
        supervised_area_ids: supervisorAreaIds,
      };

      const finalData = {
        ...cleanData,
        contract_start_date: data.contract_status === "permanent" ? undefined : cleanData.contract_start_date,
        contract_end_date: data.contract_status === "permanent" ? undefined : cleanData.contract_end_date,
      };

      if (isEditing && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, data: finalData });

        // Sync area assignments via PUT /employees/:id/areas
        if (areaAssignments.length > 0) {
          await bulkUpdateAreas.mutateAsync({
            id: employee.id,
            data: { assignments: areaAssignments },
          });
        }
        toast.success(t("updateSuccess"));
      } else {
        await createEmployee.mutateAsync(finalData);
        toast.success(t("createSuccess"));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update employee" : "Failed to create employee");
    }
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending || bulkUpdateAreas.isPending;

  const handleAddArea = () => {
    if (!selectedAreaId) {
      return;
    }
    const newAssignment = { area_id: selectedAreaId, is_supervisor: false };
    setAreaAssignments((prev) => [...prev, newAssignment]);
    setSelectedAreaId("");
  };

  const handleRemoveArea = (areaId: string) => {
    setAreaAssignments((prev) => prev.filter((a) => a.area_id !== areaId));
  };

  const handleToggleSupervisor = (areaId: string) => {
    setAreaAssignments((prev) =>
      prev.map((a) =>
        a.area_id === areaId ? { ...a, is_supervisor: !a.is_supervisor } : a
      )
    );
  };

  const getAreaName = (areaId: string): string => {
    return areaOptions.find((a) => a.id === areaId)?.name ?? areaId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="cursor-pointer">{t("tabs.basic")}</TabsTrigger>
              <TabsTrigger value="employment" className="cursor-pointer">{t("tabs.employment")}</TabsTrigger>
              <TabsTrigger value="contract" className="cursor-pointer">{t("tabs.contract")}</TabsTrigger>
              <TabsTrigger value="areas" className="cursor-pointer">{t("tabs.areas")}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.employeeCode")} *</FieldLabel>
                  <Input placeholder={t("form.employeeCodePlaceholder")} {...register("employee_code")} />
                  {errors.employee_code && <FieldError>{errors.employee_code.message}</FieldError>}
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.name")} *</FieldLabel>
                  <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.email")}</FieldLabel>
                  <Input type="email" placeholder={t("form.emailPlaceholder")} {...register("email")} />
                  {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.phone")}</FieldLabel>
                  <Input placeholder={t("form.phonePlaceholder")} {...register("phone")} />
                </Field>
              </div>

              {/* User account link */}
              <Field orientation="vertical">
                <FieldLabel>{t("form.user")}</FieldLabel>
                <Controller
                  control={control}
                  name="user_id"
                  render={({ field }) => {
                    
                    return (
                      <Select
                        value={field.value || ""}
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.userPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("form.noUser")}</SelectItem>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("form.userHint")}</p>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.gender")}</FieldLabel>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={(v) => field.onChange(v as Gender)}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.genderPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {t(`form.gender${g.charAt(0).toUpperCase() + g.slice(1)}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.dateOfBirth")}</FieldLabel>
                  <Controller
                    control={control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value instanceof Date ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t("form.selectDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            month={field.value instanceof Date ? field.value : undefined}
                            selected={field.value instanceof Date ? field.value : undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("form.address")}</FieldLabel>
                <Textarea placeholder={t("form.addressPlaceholder")} {...register("address")} />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.nik")}</FieldLabel>
                  <Input placeholder={t("form.nikPlaceholder")} {...register("nik")} />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.npwp")}</FieldLabel>
                  <Input placeholder={t("form.npwpPlaceholder")} {...register("npwp")} />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.bpjs")}</FieldLabel>
                  <Input placeholder={t("form.bpjsPlaceholder")} {...register("bpjs")} />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.division")}</FieldLabel>
                  <Controller
                    control={control}
                    name="division_id"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.divisionPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.jobPosition")}</FieldLabel>
                  <Controller
                    control={control}
                    name="job_position_id"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.jobPositionPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("form.company")}</FieldLabel>
                <Controller
                  control={control}
                  name="company_id"
                  render={({ field }) => {
                    
                    return (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.companyPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  }}
                />
              </Field>
              <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                <FieldLabel>{t("form.isActive")}</FieldLabel>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
              </Field>
            </TabsContent>

            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.contractStatus")}</FieldLabel>
                  <Controller
                    control={control}
                    name="contract_status"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={(v) => field.onChange(v as ContractStatus)}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.contractStatusPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{t(`contractStatus.${s}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.totalLeaveQuota")}</FieldLabel>
                  <Input type="number" min={0} {...register("total_leave_quota")} />
                </Field>
              </div>
              {/* Contract dates only shown for non-permanent contracts */}
              {watch("contract_status") && watch("contract_status") !== "permanent" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contractStartDate")}</FieldLabel>
                    <Controller
                      control={control}
                      name="contract_start_date"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value instanceof Date ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("form.selectDate")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              month={field.value instanceof Date ? field.value : undefined}
                              selected={field.value instanceof Date ? field.value : undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contractEndDate")}</FieldLabel>
                    <Controller
                      control={control}
                      name="contract_end_date"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value instanceof Date ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("form.selectDate")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              month={field.value instanceof Date ? field.value : undefined}
                              selected={field.value instanceof Date ? field.value : undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.ptkpStatus")}</FieldLabel>
                  <Controller
                    control={control}
                    name="ptkp_status"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={(v) => field.onChange(v as PTKPStatus)}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.ptkpStatusPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {PTKP_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                  <FieldLabel>{t("form.isDisability")}</FieldLabel>
                  <Controller
                    control={control}
                    name="is_disability"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="cursor-pointer"
                      />
                    )}
                  />
                </Field>
              </div>
            </TabsContent>

            {/* Areas tab */}
            <TabsContent value="areas" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">{t("form.areasDescription")}</p>

              {/* Add area row */}
              <div className="flex gap-2">
                <Select
                  value={selectedAreaId}
                  onValueChange={setSelectedAreaId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("form.selectArea")} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddArea}
                  disabled={!selectedAreaId}
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Assigned areas list */}
              {areaAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t("form.noAreasAssigned")}
                </div>
              ) : (
                <div className="space-y-2">
                  {areaAssignments.map((assignment) => (
                    <div
                      key={assignment.area_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {assignment.is_supervisor ? (
                          <Shield className="h-4 w-4 text-amber-500" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {getAreaName(assignment.area_id)}
                        </span>
                        <Badge variant={assignment.is_supervisor ? "warning" : "secondary"}>
                          {assignment.is_supervisor ? t("form.supervisor") : t("form.member")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSupervisor(assignment.area_id)}
                          className="cursor-pointer text-xs"
                        >
                          {assignment.is_supervisor ? t("form.setMember") : t("form.setSupervisor")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveArea(assignment.area_id)}
                          className="cursor-pointer text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              <ButtonLoading loading={isPending} loadingText={t("actions.saving") || "Saving..."}>
                {t("actions.save")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
