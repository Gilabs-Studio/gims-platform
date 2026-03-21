"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { Employee } from "../types";
import {
  useEmployees,
  useEmployee,
  useDeleteEmployee,
  useUpdateEmployee,
} from "./use-employees";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";
import { useJobPositions } from "@/features/master-data/organization/hooks/use-job-positions";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";


export function useEmployeeList() {
  const t = useTranslations("employee");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openIdFromUrl = searchParams.get("openId");

  // Permissions
  const canCreate = useUserPermission("employee.create");
  const canUpdate = useUserPermission("employee.update");
  const canDelete = useUserPermission("employee.delete");
  const canApprove = useUserPermission("employee.approve");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [divisionFilter, setDivisionFilter] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");

  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries & Mutations
  const { data: openEmployeeData } = useEmployee(openIdFromUrl ?? undefined);
  const { data: divisionsData } = useDivisions({ per_page: 20 });
  const { data: positionsData } = useJobPositions({ per_page: 20 });
  const { data: companiesData } = useCompanies({ per_page: 20 });

  const { data, isLoading, isError, refetch } = useEmployees({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    division_id: divisionFilter || undefined,
    job_position_id: positionFilter || undefined,
    company_id: companyFilter || undefined,
  });

  const deleteMutation = useDeleteEmployee();
  const updateMutation = useUpdateEmployee();

  const employees = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const divisions = divisionsData?.data ?? [];
  const positions = positionsData?.data ?? [];
  const companies = companiesData?.data ?? [];

  // Effects
  useEffect(() => {
    if (!openIdFromUrl || !openEmployeeData?.data) return;

    // Keep the state update asynchronous to avoid sync cascading render warnings
    const timeoutId = window.setTimeout(() => {
      setDetailEmployee(openEmployeeData.data);
      setIsDetailOpen(true);
      router.replace(pathname, { scroll: false });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [openIdFromUrl, openEmployeeData?.data, pathname, router]);

  // Handlers
  const handleCreate = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleViewDetail = (employee: Employee) => {
    setDetailEmployee(employee);
    setIsDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success(t("deleteSuccess"));
      setDeletingId(null);
    } catch {
      toast.error("Failed to delete employee");
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_active: !currentStatus } });
      toast.success(t("updateSuccess"));
    } catch {
      toast.error("Failed to update status");
    }
  };





  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      divisionFilter,
      positionFilter,
      companyFilter,
      isFormOpen,
      editingEmployee,
      deletingId,
      detailEmployee,
      isDetailOpen,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDivisionFilter,
      setPositionFilter,
      setCompanyFilter,
      setDeletingId,
      setIsDetailOpen,
      handleCreate,
      handleEdit,
      handleViewDetail,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      employees,
      pagination,
      divisions,
      positions,
      companies,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteMutation.isPending,
      isUpdating: updateMutation.isPending,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
      canApprove,
    },
    translations: {
      t,
    },
  };
}
