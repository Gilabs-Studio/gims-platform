"use client";

import { useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";
import type { Employee, ContractStatus, Gender, PTKPStatus } from "../types";
import { useCreateEmployee, useUpdateEmployee } from "../hooks/use-employees";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";
import { useJobPositions } from "@/features/master-data/organization/hooks/use-job-positions";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";

const employeeSchema = z.object({
  employee_code: z.string().min(1, "Employee code is required").max(50),
  name: z.string().min(2, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
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

  const { data: divisionsData } = useDivisions({ per_page: 100 });
  const { data: positionsData } = useJobPositions({ per_page: 100 });
  const { data: companiesData } = useCompanies({ per_page: 100 });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const divisions = divisionsData?.data ?? [];
  const positions = positionsData?.data ?? [];
  const companies = companiesData?.data ?? [];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      employee_code: "",
      name: "",
      email: "",
      phone: "",
      division_id: "",
      job_position_id: "",
      company_id: "",
      date_of_birth: undefined,
      place_of_birth: "",
      gender: null,
      religion: "",
      address: "",
      nik: "",
      npwp: "",
      bpjs: "",
      contract_status: "permanent",
      contract_start_date: undefined,
      contract_end_date: undefined,
      total_leave_quota: 12,
      ptkp_status: "TK/0",
      is_disability: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        employee_code: employee.employee_code,
        name: employee.name,
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        division_id: employee.division_id ?? "",
        job_position_id: employee.job_position_id ?? "",
        company_id: employee.company_id ?? "",
        date_of_birth: employee.date_of_birth ? new Date(employee.date_of_birth) : undefined,
        place_of_birth: employee.place_of_birth ?? "",
        gender: employee.gender ?? null,
        religion: employee.religion ?? "",
        address: employee.address ?? "",
        nik: employee.nik ?? "",
        npwp: employee.npwp ?? "",
        bpjs: employee.bpjs ?? "",
        contract_status: employee.contract_status ?? "permanent",
        contract_start_date: employee.contract_start_date ? new Date(employee.contract_start_date) : undefined,
        contract_end_date: employee.contract_end_date ? new Date(employee.contract_end_date) : undefined,
        total_leave_quota: employee.total_leave_quota ?? 12,
        ptkp_status: employee.ptkp_status ?? "TK/0",
        is_disability: employee.is_disability ?? false,
        is_active: employee.is_active,
      });
    } else {
      reset({
        employee_code: "",
        name: "",
        email: "",
        phone: "",
        division_id: "",
        job_position_id: "",
        company_id: "",
        date_of_birth: undefined,
        place_of_birth: "",
        gender: null,
        religion: "",
        address: "",
        nik: "",
        npwp: "",
        bpjs: "",
        contract_status: "permanent",
        contract_start_date: undefined,
        contract_end_date: undefined,
        total_leave_quota: 12,
        ptkp_status: "TK/0",
        is_disability: false,
        is_active: true,
      });
    }
  }, [employee, reset]);

  const onSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
    try {
      // Clean up empty strings to undefined for API
      const cleanData = {
        employee_code: data.employee_code,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        division_id: data.division_id || undefined,
        job_position_id: data.job_position_id || undefined,
        company_id: data.company_id || undefined,
        date_of_birth: data.date_of_birth instanceof Date ? data.date_of_birth.toISOString() : undefined,
        place_of_birth: data.place_of_birth || undefined,
        gender: data.gender ?? undefined,
        religion: data.religion || undefined,
        address: data.address || undefined,
        nik: data.nik || undefined,
        npwp: data.npwp || undefined,
        bpjs: data.bpjs || undefined,
        contract_status: data.contract_status ?? undefined,
        contract_start_date: data.contract_start_date instanceof Date ? data.contract_start_date.toISOString() : undefined,
        contract_end_date: data.contract_end_date instanceof Date ? data.contract_end_date.toISOString() : undefined,
        total_leave_quota: data.total_leave_quota,
        ptkp_status: data.ptkp_status ?? undefined,
        is_disability: data.is_disability,
        is_active: data.is_active,
      };

      if (isEditing && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, data: cleanData });
        toast.success(t("updateSuccess"));
      } else {
        await createEmployee.mutateAsync(cleanData);
        toast.success(t("createSuccess"));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update employee" : "Failed to create employee");
    }
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;
  const isActive = watch("is_active");
  const isDisability = watch("is_disability");
  const gender = watch("gender");
  const contractStatus = watch("contract_status");
  const ptkpStatus = watch("ptkp_status");
  const divisionId = watch("division_id");
  const jobPositionId = watch("job_position_id");
  const companyId = watch("company_id");

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="cursor-pointer">Basic Info</TabsTrigger>
              <TabsTrigger value="employment" className="cursor-pointer">Employment</TabsTrigger>
              <TabsTrigger value="contract" className="cursor-pointer">Contract</TabsTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.gender")}</FieldLabel>
                  <Select
                    value={gender ?? ""}
                    onValueChange={(v) => setValue("gender", v as Gender)}
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
                  <Select
                    value={divisionId ?? ""}
                    onValueChange={(v) => setValue("division_id", v)}
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
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.jobPosition")}</FieldLabel>
                  <Select
                    value={jobPositionId ?? ""}
                    onValueChange={(v) => setValue("job_position_id", v)}
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
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("form.company")}</FieldLabel>
                <Select
                  value={companyId ?? ""}
                  onValueChange={(v) => setValue("company_id", v)}
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
              </Field>
              <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                <FieldLabel>{t("form.isActive")}</FieldLabel>
                <Switch
                  checked={isActive}
                  onCheckedChange={(val) => setValue("is_active", val)}
                  className="cursor-pointer"
                />
              </Field>
            </TabsContent>

            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.contractStatus")}</FieldLabel>
                  <Select
                    value={contractStatus ?? ""}
                    onValueChange={(v) => setValue("contract_status", v as ContractStatus)}
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
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.totalLeaveQuota")}</FieldLabel>
                  <Input type="number" min={0} {...register("total_leave_quota")} />
                </Field>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.ptkpStatus")}</FieldLabel>
                  <Select
                    value={ptkpStatus ?? ""}
                    onValueChange={(v) => setValue("ptkp_status", v as PTKPStatus)}
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
                </Field>
                <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                  <FieldLabel>{t("form.isDisability")}</FieldLabel>
                  <Switch
                    checked={isDisability}
                    onCheckedChange={(val) => setValue("is_disability", val)}
                    className="cursor-pointer"
                  />
                </Field>
              </div>
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
              {isPending ? "..." : t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
