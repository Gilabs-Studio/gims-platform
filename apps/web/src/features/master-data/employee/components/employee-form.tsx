"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Shield,
  User,
  FileText,
} from "lucide-react";
import { cn, sortOptions } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { FileUpload } from "@/components/ui/file-upload";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { toast } from "sonner";
import type {
  Employee,
  Gender,
  PTKPStatus,
  AreaAssignment,
  ContractType,
  CreateEmployeeData,
} from "../types";
import {
  useCreateEmployee,
  useUpdateEmployee,
  useAvailableUsers,
  useEmployeeFormData,
  useBulkUpdateEmployeeAreas,
  useEmployee,
} from "../hooks/use-employees";
import { useDivisions, useCreateDivision } from "@/features/master-data/organization/hooks/use-divisions";
import { useJobPositions, useCreateJobPosition } from "@/features/master-data/organization/hooks/use-job-positions";
import { DivisionForm } from "@/features/master-data/organization/components/division/division-form";
import { JobPositionForm } from "@/features/master-data/organization/components/job-position/job-position-form";
import { useCompanies, useCreateCompany } from "@/features/master-data/organization/hooks/use-companies";
import { useCreateUser, useRoles } from "@/features/master-data/user-management/hooks/use-users";
import { ButtonLoading } from "@/components/loading";
import {
  employeeSchema,
  type EmployeeFormData,
} from "../schemas/employee.schema";

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onCreated?: (item: { id: string; name: string }) => void;
}

const GENDER_OPTIONS: Gender[] = ["male", "female"];
const CONTRACT_TYPE_OPTIONS: ContractType[] = ["PKWTT", "PKWT", "Intern"];
const PTKP_OPTIONS: PTKPStatus[] = [
  "TK/0",
  "TK/1",
  "TK/2",
  "TK/3",
  "K/0",
  "K/1",
  "K/2",
  "K/3",
  "K/I/0",
  "K/I/1",
  "K/I/2",
  "K/I/3",
];

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
  onCreated,
}: EmployeeFormProps) {
  const t = useTranslations("employee");
  const isEditing = !!employee;

  // Fetch full employee details when in edit mode
  const { data: employeeDetailData } = useEmployee(employee?.id);

  // Use detailed data if available, otherwise fall back to prop data
  const employeeData = employeeDetailData?.data || employee;

  // Area assignments state (managed separately from the main form)
  const [areaAssignments, setAreaAssignments] = useState<AreaAssignment[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  const [divisionFormOpen, setDivisionFormOpen] = useState(false);
  const [jobPositionFormOpen, setJobPositionFormOpen] = useState(false);

  const { data: divisionsData } = useDivisions({ per_page: 100 });
  const { data: positionsData } = useJobPositions({ per_page: 100 });
  const { data: companiesData } = useCompanies({ per_page: 100 });
  const { data: availableUsersData } = useAvailableUsers(
    undefined,
    employee?.id,
  );
  const { data: formDataResp } = useEmployeeFormData();

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const bulkUpdateAreas = useBulkUpdateEmployeeAreas();

  const createDivision = useCreateDivision();
  const createJobPosition = useCreateJobPosition();
  const createCompany = useCreateCompany();

  const createUser = useCreateUser();
  const { data: rolesData } = useRoles();

  const divisions = sortOptions(divisionsData?.data ?? [], (d) => d.name);
  const positions = sortOptions(positionsData?.data ?? [], (p) => p.name);
  const companies = sortOptions(companiesData?.data ?? [], (c) => c.name);
  const roles = sortOptions(rolesData?.data ?? [], (r) => r.name);

  const availableUsers = useMemo(
    () => availableUsersData?.data ?? [],
    [availableUsersData],
  );

  // Areas from the form-data endpoint for the area assignment dropdown
  const areaOptions = useMemo(
    () => sortOptions(formDataResp?.data?.areas ?? [], (a) => a.name),
    [formDataResp],
  );

  // Filter out already-assigned areas from the dropdown
  const unassignedAreas = useMemo(
    () =>
      areaOptions.filter(
        (a) => !areaAssignments.some((aa) => aa.area_id === a.id),
      ),
    [areaOptions, areaAssignments],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      include_contract: false,
      contract_number: "",
      contract_type: undefined,
      contract_start_date: undefined,
      contract_end_date: undefined,
      contract_document: undefined,
      total_leave_quota: 12,
      ptkp_status: undefined,
      is_active: true,
      create_user: false,
      role_id: undefined,
      password: "",
    },
  });

  useEffect(() => {
    // Reset form when modal opens or employeeData changes
    if (!open) {
      return;
    }

    if (employeeData) {
      // Extract IDs from nested objects (API returns nested objects, not IDs)
      const divisionId =
        employeeData.division_id || employeeData.division?.id || "";
      const jobPositionId =
        employeeData.job_position_id || employeeData.job_position?.id || "";
      const companyId =
        employeeData.company_id || employeeData.company?.id || "";
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
        date_of_birth: employeeData.date_of_birth
          ? new Date(employeeData.date_of_birth)
          : undefined,
        place_of_birth: employeeData.place_of_birth ?? "",
        gender: employeeData.gender ?? undefined,
        religion: employeeData.religion ?? "",
        address: employeeData.address ?? "",
        nik: employeeData.nik ?? "",
        npwp: employeeData.npwp ?? "",
        bpjs: employeeData.bpjs ?? "",
        total_leave_quota: employeeData.total_leave_quota ?? 12,
        ptkp_status: employeeData.ptkp_status ?? undefined,
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
        include_contract: false,
        contract_number: "",
        contract_type: undefined,
        contract_start_date: undefined,
        contract_end_date: undefined,
        contract_document: undefined,
        total_leave_quota: 12,
        ptkp_status: undefined,
        is_active: true,
        create_user: false,
        role_id: undefined,
        password: "",
      });
      setAreaAssignments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id, employeeData]);

  const contractType = watch("contract_type");
  const includeContract = watch("include_contract");
  const contractStartDate = watch("contract_start_date");

  const onSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
    try {
      const wantsContract = !isEditing && data.include_contract && data.contract_type;

      if (wantsContract) {
        if (!data.contract_number?.trim()) {
          toast.error(t("contract.validation.contractNumberRequired"));
          return;
        }
        if (!data.contract_start_date) {
          toast.error(t("contract.validation.startDateRequired"));
          return;
        }
        if (data.contract_type !== "PKWTT" && !data.contract_end_date) {
          toast.error(t("contract.validation.endDateRequiredForNonPermanent"));
          return;
        }
      }

      const memberAreaIds = areaAssignments
        .filter((a) => !a.is_supervisor)
        .map((a) => a.area_id);
      const supervisorAreaIds = areaAssignments
        .filter((a) => a.is_supervisor)
        .map((a) => a.area_id);

      let finalUserId = data.user_id || undefined;

      if (!isEditing && data.create_user) {
        if (!data.role_id) {
          toast.error("Role is required when creating a user");
          return;
        }
        if (!data.password || data.password.length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        if (!data.email) {
          toast.error("Email is required when creating a user linked to employee");
          return;
        }

        const newUser = await createUser.mutateAsync({
          name: data.name,
          email: data.email,
          password: data.password,
          role_id: data.role_id,
          status: "active",
        });
        finalUserId = newUser.data.id;
      }

      const baseData = {
        employee_code: data.employee_code,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        user_id: finalUserId,
        division_id: data.division_id || undefined,
        job_position_id: data.job_position_id || undefined,
        company_id: data.company_id || undefined,
        date_of_birth:
          data.date_of_birth instanceof Date
            ? data.date_of_birth.toISOString()
            : undefined,
        place_of_birth: data.place_of_birth || undefined,
        gender: data.gender || undefined,
        religion: data.religion || undefined,
        address: data.address || undefined,
        nik: data.nik || undefined,
        npwp: data.npwp || undefined,
        bpjs: data.bpjs || undefined,
        total_leave_quota: data.total_leave_quota,
        ptkp_status: data.ptkp_status || undefined,
        is_active: data.is_active,
        area_ids: memberAreaIds,
        supervised_area_ids: supervisorAreaIds,
      };

      if (isEditing && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, data: baseData });

        if (areaAssignments.length > 0) {
          await bulkUpdateAreas.mutateAsync({
            id: employee.id,
            data: { assignments: areaAssignments },
          });
        }
        toast.success(t("updateSuccess"));
      } else {
        const cleanData: CreateEmployeeData = {
          ...baseData,
          initial_contract: wantsContract
            ? {
                contract_number: data.contract_number!,
                contract_type: data.contract_type!,
                start_date:
                  data.contract_start_date instanceof Date
                    ? format(data.contract_start_date, "yyyy-MM-dd")
                    : (data.contract_start_date as string),
                end_date:
                  data.contract_type === "PKWTT"
                    ? undefined
                    : data.contract_end_date instanceof Date
                      ? format(data.contract_end_date, "yyyy-MM-dd")
                      : (data.contract_end_date as string),
                document_path: data.contract_document || undefined,
              }
            : undefined,
        };

        const result = await createEmployee.mutateAsync(cleanData);
        toast.success(t("createSuccess"));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }
      onOpenChange(false);
    } catch {
      toast.error(
        isEditing ? "Failed to update employee" : "Failed to create employee",
      );
    }
  };

  const isPending =
    createUser.isPending ||
    createEmployee.isPending ||
    updateEmployee.isPending ||
    bulkUpdateAreas.isPending ||
    createDivision.isPending ||
    createJobPosition.isPending ||
    createCompany.isPending;

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
        a.area_id === areaId ? { ...a, is_supervisor: !a.is_supervisor } : a,
      ),
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
            <TabsList
              className={cn(
                "grid w-full",
                isEditing ? "grid-cols-3" : "grid-cols-4",
              )}
            >
              <TabsTrigger value="basic" className="cursor-pointer">
                {t("tabs.basic")}
              </TabsTrigger>
              <TabsTrigger value="employment" className="cursor-pointer">
                {t("tabs.employment")}
              </TabsTrigger>
              {!isEditing && (
                <TabsTrigger value="contract" className="cursor-pointer">
                  {t("tabs.contract")}
                </TabsTrigger>
              )}
              <TabsTrigger value="areas" className="cursor-pointer">
                {t("tabs.areas")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-4">
                {isEditing && (
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.employeeCode")}</FieldLabel>
                    <Input
                      placeholder={t("form.employeeCodePlaceholder")}
                      {...register("employee_code")}
                      disabled
                    />
                    {errors.employee_code && (
                      <FieldError>{errors.employee_code.message}</FieldError>
                    )}
                  </Field>
                )}
                <Field orientation="vertical">
                  <FieldLabel>{t("form.name")} *</FieldLabel>
                  <Input
                    placeholder={t("form.namePlaceholder")}
                    {...register("name")}
                  />
                  {errors.name && (
                    <FieldError>{errors.name.message}</FieldError>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.email")}</FieldLabel>
                  <Input
                    type="email"
                    placeholder={t("form.emailPlaceholder")}
                    {...register("email")}
                  />
                  {errors.email && (
                    <FieldError>{errors.email.message}</FieldError>
                  )}
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.phone")}</FieldLabel>
                  <Input
                    placeholder={t("form.phonePlaceholder")}
                    {...register("phone")}
                  />
                </Field>
              </div>

              {/* User account link */}
              <div className="space-y-4 p-4 border rounded-lg">
                {!isEditing && (
                  <Field
                    orientation="horizontal"
                    className="flex justify-between items-center"
                  >
                    <div className="space-y-0.5">
                      <FieldLabel className="text-base text-foreground">Create User Account</FieldLabel>
                      <p className="text-sm text-muted-foreground">Automatically create and link a system user.</p>
                    </div>
                    <Controller
                      control={control}
                      name="create_user"
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="cursor-pointer"
                        />
                      )}
                    />
                  </Field>
                )}

                {watch("create_user") && !isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Field orientation="vertical">
                      <FieldLabel>Role *</FieldLabel>
                      <Controller
                        control={control}
                        name="role_id"
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                    <Field orientation="vertical">
                      <FieldLabel>Password *</FieldLabel>
                      <Input
                        type="password"
                        placeholder="Enter password (min 8 chars)"
                        {...register("password")}
                      />
                      {errors.password && (
                        <FieldError>{errors.password.message}</FieldError>
                      )}
                    </Field>
                  </div>
                ) : (
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.user")}</FieldLabel>
                    <Controller
                      control={control}
                      name="user_id"
                      render={({ field }) => {
                        return (
                          <Select
                            value={field.value || ""}
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? "" : v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("form.userPlaceholder")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                {t("form.noUser")}
                              </SelectItem>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("form.userHint")}
                    </p>
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
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
                            <SelectValue
                              placeholder={t("form.genderPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g}>
                                {t(
                                  `form.gender${g.charAt(0).toUpperCase() + g.slice(1)}`,
                                )}
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
                              !field.value && "text-muted-foreground",
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
                            month={
                              field.value instanceof Date
                                ? field.value
                                : undefined
                            }
                            selected={
                              field.value instanceof Date
                                ? field.value
                                : undefined
                            }
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
                <Textarea
                  placeholder={t("form.addressPlaceholder")}
                  {...register("address")}
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.nik")}</FieldLabel>
                  <Input
                    placeholder={t("form.nikPlaceholder")}
                    {...register("nik")}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.npwp")}</FieldLabel>
                  <Input
                    placeholder={t("form.npwpPlaceholder")}
                    {...register("npwp")}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.bpjs")}</FieldLabel>
                  <Input
                    placeholder={t("form.bpjsPlaceholder")}
                    {...register("bpjs")}
                  />
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
                    render={({ field }) => (
                      <CreatableCombobox
                        options={divisions.map((d) => ({
                          value: d.id,
                          label: d.name,
                        }))}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t("form.divisionPlaceholder")}
                        createPermission="division.create"
                        onCreateClick={() => setDivisionFormOpen(true)}
                      />
                    )}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.jobPosition")}</FieldLabel>
                  <Controller
                    control={control}
                    name="job_position_id"
                    render={({ field }) => (
                      <CreatableCombobox
                        options={positions.map((p) => ({
                          value: p.id,
                          label: p.name,
                        }))}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t("form.jobPositionPlaceholder")}
                        createPermission="job_position.create"
                        onCreateClick={() => setJobPositionFormOpen(true)}
                      />
                    )}
                  />
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("form.company")}</FieldLabel>
                <Controller
                  control={control}
                  name="company_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      options={companies.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={t("form.companyPlaceholder")}
                      createPermission="company.create"
                      onCreateClick={async (query) => {
                        try {
                          const res = await createCompany.mutateAsync({
                            name: query,
                            is_active: true,
                          });
                          field.onChange(res.data.id);
                          toast.success(t("createSuccess"));
                        } catch {
                          toast.error("Failed to create company");
                        }
                      }}
                      isLoading={createCompany.isPending}
                      disabled={createCompany.isPending}
                    />
                  )}
                />
              </Field>
              <Field orientation="vertical">
                <FieldLabel>{t("form.totalLeaveQuota")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  {...register("total_leave_quota")}
                />
              </Field>
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
                            <SelectValue
                              placeholder={t("form.ptkpStatusPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {PTKP_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }}
                  />
                </Field>
              </div>
              <Field
                orientation="horizontal"
                className="flex items-center justify-between rounded-lg border p-3"
              >
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

            {/* Contract tab - only shown in create mode */}
            {!isEditing && (
              <TabsContent value="contract" className="space-y-4 mt-4">
                <Field
                  orientation="horizontal"
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <FieldLabel className="text-base">
                      {t("form.includeContract")}
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      {t("form.includeContractHint")}
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="include_contract"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="cursor-pointer"
                      />
                    )}
                  />
                </Field>

                {includeContract && (
                  <>
                    <Field orientation="vertical">
                      <FieldLabel>
                        {t("form.contractNumber")} *
                      </FieldLabel>
                      <Input
                        placeholder={t("form.contractNumberPlaceholder")}
                        {...register("contract_number")}
                      />
                    </Field>
                    <Field orientation="vertical">
                      <FieldLabel>{t("form.contractType")} *</FieldLabel>
                      <Controller
                        control={control}
                        name="contract_type"
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={(v) =>
                              field.onChange(v as ContractType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t(
                                  "form.contractTypePlaceholder",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTRACT_TYPE_OPTIONS.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {t(`contract.types.${type}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field orientation="vertical">
                        <FieldLabel>
                          {t("form.contractStartDate")} *
                        </FieldLabel>
                        <Controller
                          control={control}
                          name="contract_start_date"
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
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
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  month={
                                    field.value instanceof Date
                                      ? field.value
                                      : undefined
                                  }
                                  selected={
                                    field.value instanceof Date
                                      ? field.value
                                      : undefined
                                  }
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </Field>
                      {contractType !== "PKWTT" && (
                        <Field orientation="vertical">
                          <FieldLabel>
                            {t("form.contractEndDate")} *
                          </FieldLabel>
                          <Controller
                            control={control}
                            name="contract_end_date"
                            render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
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
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    month={
                                      field.value instanceof Date
                                        ? field.value
                                        : undefined
                                    }
                                    selected={
                                      field.value instanceof Date
                                        ? field.value
                                        : undefined
                                    }
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      contractStartDate instanceof Date
                                        ? date <= contractStartDate
                                        : false
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          />
                        </Field>
                      )}
                    </div>
                    <Field orientation="vertical">
                      <FieldLabel>{t("form.document")}</FieldLabel>
                      <Controller
                        control={control}
                        name="contract_document"
                        render={({ field }) => (
                          <FileUpload
                            value={field.value || ""}
                            onChange={(url) => field.onChange(url || "")}
                            placeholder={t("contract.placeholders.document")}
                            accept=".pdf,.doc,.docx"
                          />
                        )}
                      />
                    </Field>
                  </>
                )}

                {!includeContract && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm text-center">
                      {t("form.contractOptionalHint")}
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Areas tab */}
            <TabsContent value="areas" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                {t("form.areasDescription")}
              </p>

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
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
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
                          <Shield className="h-4 w-4 text-warning" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {getAreaName(assignment.area_id)}
                        </span>
                        <Badge
                          variant={
                            assignment.is_supervisor ? "warning" : "secondary"
                          }
                        >
                          {assignment.is_supervisor
                            ? t("form.supervisor")
                            : t("form.member")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleSupervisor(assignment.area_id)
                          }
                          className="cursor-pointer text-xs"
                        >
                          {assignment.is_supervisor
                            ? t("form.setMember")
                            : t("form.setSupervisor")}
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
            <Button
              type="submit"
              disabled={isPending}
              className="cursor-pointer"
            >
              <ButtonLoading
                loading={isPending}
                loadingText={t("actions.saving") || "Saving..."}
              >
                {t("actions.save")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>

      <DivisionForm 
        open={divisionFormOpen} 
        onClose={() => setDivisionFormOpen(false)} 
      />
      <JobPositionForm 
        open={jobPositionFormOpen} 
        onClose={() => setJobPositionFormOpen(false)} 
      />
    </Dialog>
  );
}
