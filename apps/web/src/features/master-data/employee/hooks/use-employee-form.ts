import { useEffect, useState, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { sortOptions } from "@/lib/utils";
import type { Employee, ContractStatus, Gender, PTKPStatus, AreaAssignment } from "../types";
import {
  useCreateEmployee,
  useUpdateEmployee,
  useAvailableUsers,
  useEmployeeFormData,
  useBulkUpdateEmployeeAreas,
  useEmployee,
} from "./use-employees";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";
import { useJobPositions } from "@/features/master-data/organization/hooks/use-job-positions";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";

export const CONTRACT_STATUS_OPTIONS: ContractStatus[] = ["permanent", "contract", "probation", "intern"];
export const GENDER_OPTIONS: Gender[] = ["male", "female"];
export const PTKP_OPTIONS: PTKPStatus[] = [
  "TK/0", "TK/1", "TK/2", "TK/3",
  "K/0", "K/1", "K/2", "K/3",
  "K/I/0", "K/I/1", "K/I/2", "K/I/3",
];

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

export type EmployeeFormData = z.infer<typeof employeeSchema>;

export interface UseEmployeeFormProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

export function useEmployeeForm({ open, onClose, employee }: UseEmployeeFormProps) {
  const t = useTranslations("employee");
  const isEditing = !!employee;

  const { data: employeeDetailData } = useEmployee(employee?.id ?? "", { enabled: open && !!employee });
  const employeeData = employeeDetailData?.data || employee;

  const [areaAssignments, setAreaAssignments] = useState<AreaAssignment[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  const { data: divisionsData } = useDivisions({ per_page: 100 }, { enabled: open });
  const { data: positionsData } = useJobPositions({ per_page: 100 }, { enabled: open });
  const { data: companiesData } = useCompanies({ per_page: 100 }, { enabled: open });
  const { data: availableUsersData } = useAvailableUsers(undefined, employee?.id, { enabled: open });
  const { data: formDataResp } = useEmployeeFormData({ enabled: open });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const bulkUpdateAreas = useBulkUpdateEmployeeAreas();

  // Handle generic object properties directly based on component expectations
  const divisions = sortOptions(divisionsData?.data ?? [], (d: { name: string }) => d.name);
  const positions = sortOptions(positionsData?.data ?? [], (p: { name: string }) => p.name);
  const companies = sortOptions(companiesData?.data ?? [], (c: { name: string }) => c.name);

  const availableUsers = useMemo(
    () => availableUsersData?.data ?? [],
    [availableUsersData]
  );

  const areaOptions = useMemo(
    () => sortOptions(formDataResp?.data?.areas ?? [], (a: { name: string }) => a.name),
    [formDataResp]
  );

  const unassignedAreas = useMemo(
    () =>
      areaOptions.filter(
        (a: { id: string }) => !areaAssignments.some((aa) => aa.area_id === a.id)
      ),
    [areaOptions, areaAssignments]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<EmployeeFormData>({
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
    if (!open) return;

    if (employeeData) {
      const divisionId = employeeData.division_id || employeeData.division?.id || "";
      const jobPositionId = employeeData.job_position_id || employeeData.job_position?.id || "";
      const companyId = employeeData.company_id || employeeData.company?.id || "";
      const userId = employeeData.user_id || employeeData.user?.id || "";

      form.reset({
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
      }, {
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
      form.reset({
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
  }, [open, employeeData, form]);

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
      onClose();
    } catch {
      toast.error(isEditing ? "Failed to update employee" : "Failed to create employee");
    }
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending || bulkUpdateAreas.isPending;

  const handleAddArea = () => {
    if (!selectedAreaId) return;
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
    return areaOptions.find((a: { id: string, name: string }) => a.id === areaId)?.name ?? areaId;
  };

  return {
    form,
    t,
    isEditing,
    isPending,
    areaAssignments,
    selectedAreaId,
    setSelectedAreaId,
    divisions,
    positions,
    companies,
    availableUsers,
    unassignedAreas,
    handleAddArea,
    handleRemoveArea,
    handleToggleSupervisor,
    getAreaName,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
