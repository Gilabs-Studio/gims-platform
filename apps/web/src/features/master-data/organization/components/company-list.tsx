"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import {
  useCompanies,
  useDeleteCompany,
  useUpdateCompany,
  useApproveCompany,
  useSubmitCompanyForApproval,
} from "../hooks/use-companies";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CompanyForm } from "./company-form";
import type { Company, CompanyStatus } from "../types";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const statusColors: Record<CompanyStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function CompanyList() {
  const t = useTranslations("organization");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useCompanies({
    page,
    per_page: 10,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("company.create");
  const canUpdate = useUserPermission("company.update");
  const canDelete = useUserPermission("company.delete");
  const canApprove = useUserPermission("company.approve");

  const deleteCompany = useDeleteCompany();
  const updateCompany = useUpdateCompany();
  const submitForApproval = useSubmitCompanyForApproval();
  const approveCompany = useApproveCompany();

  const companies = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCompany.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateCompany.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.success_update", { name: name }));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleSubmitForApproval = async (company: Company) => {
    try {
      await submitForApproval.mutateAsync(company.id);
      toast.success(t("company.submitSuccess"));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleApprove = async (company: Company) => {
    try {
      await approveCompany.mutateAsync({ id: company.id, data: { action: "approve" } });
      toast.success(t("company.approveSuccess"));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleReject = async (company: Company) => {
    try {
      await approveCompany.mutateAsync({ id: company.id, data: { action: "reject" } });
      toast.success(t("company.rejectSuccess"));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCompany(null);
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("company.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("company.description")}
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("common.create")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as CompanyStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">{t("company.status.draft")}</SelectItem>
            <SelectItem value="pending">{t("company.status.pending")}</SelectItem>
            <SelectItem value="approved">{t("company.status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("company.status.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("company.empty")}
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{company.name}</div>
                      {company.address && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {company.address}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.email || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.phone || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[company.status]}>
                      {t(`company.status.${company.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={company.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(
                            company.id,
                            company.is_active,
                            company.name,
                          )
                        }
                        disabled={updateCompany.isPending || !canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {company.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && (
                          <DropdownMenuItem
                            onClick={() => handleEdit(company)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        
                        {/* Workflow Actions */}
                        {company.status === "draft" && canUpdate && (
                          <DropdownMenuItem
                            onClick={() => handleSubmitForApproval(company)}
                            className="cursor-pointer"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {t("company.actions.submit")}
                          </DropdownMenuItem>
                        )}
                        
                        {company.status === "pending" && canApprove && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleApprove(company)}
                              className="cursor-pointer text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t("company.actions.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReject(company)}
                              className="cursor-pointer text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {t("company.actions.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingId(company.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.total_pages}
              className="cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <CompanyForm
        open={isFormOpen}
        onClose={handleFormClose}
        company={editingCompany}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteCompany.isPending}
        title={t("company.deleteTitle")}
        description={t("company.deleteConfirm")}
      />
    </div>
  );
}
