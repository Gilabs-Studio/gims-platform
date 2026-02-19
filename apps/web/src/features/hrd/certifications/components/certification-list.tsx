"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { useCertifications, useDeleteCertification } from "../hooks/use-certification";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CertificationForm } from "./certification-form";
import { CertificationDetailModal } from "./certification-detail-modal";
import type { EmployeeCertification, ListCertificationsParams } from "../types";
import { formatDate } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CertificationList() {
  const t = useTranslations("certification");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<ListCertificationsParams["status"]>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);
  const [viewingCertification, setViewingCertification] = useState<EmployeeCertification | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useCertifications({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter,
  });

  const canCreate = useUserPermission("employee_certification.create");
  const canUpdate = useUserPermission("employee_certification.update");
  const canDelete = useUserPermission("employee_certification.delete");
  const canView = useUserPermission("employee_certification.read");

  const deleteCertification = useDeleteCertification();
  const certifications = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (certification: EmployeeCertification) => {
    setEditingCertificationId(certification.id);
    setIsFormOpen(true);
  };

  const handleView = (certification: EmployeeCertification) => {
    setViewingCertification(certification);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteCertification.mutateAsync(deletingId);
        toast.success(t("toast.delete_success"));
        setDeletingId(null);
      } catch {
        toast.error(t("toast.delete_error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCertificationId(null);
  };

  const getExpiryBadge = (cert: EmployeeCertification) => {
    if (!cert.expiry_date) {
      return (
        <Badge variant="outline">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("status.no_expiry")}
        </Badge>
      );
    }

    if (cert.is_expired) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t("status.expired")}
        </Badge>
      );
    }

    if (cert.days_until_expiry <= 30) {
      return (
        <Badge variant="warning">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t("status.expiring_soon", { days: cert.days_until_expiry })}
        </Badge>
      );
    }

    return (
      <Badge variant="success">
        <CheckCircle className="h-3 w-3 mr-1" />
        {t("status.valid")}
      </Badge>
    );
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? undefined : (v as ListCertificationsParams["status"]));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder={t("filters.all_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("filters.all_status")}</SelectItem>
            <SelectItem value="valid" className="cursor-pointer">{t("status.valid")}</SelectItem>
            <SelectItem value="expiring_soon" className="cursor-pointer">{t("status.expiring_soon", { days: 30 })}</SelectItem>
            <SelectItem value="expired" className="cursor-pointer">{t("status.expired")}</SelectItem>
            <SelectItem value="no_expiry" className="cursor-pointer">{t("status.no_expiry")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("field.certificate_name")}</TableHead>
              <TableHead>{t("field.employee")}</TableHead>
              <TableHead>{t("field.issued_by")}</TableHead>
              <TableHead>{t("field.issue_date")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : certifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("empty.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              certifications.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell 
                    className="font-medium text-primary hover:underline cursor-pointer" 
                    onClick={() => canView && handleView(cert)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {cert.certificate_name}
                    </div>
                  </TableCell>
                  <TableCell
                    className={canView ? "cursor-pointer font-medium text-primary hover:underline" : undefined}
                    onClick={canView ? () => handleView(cert) : undefined}
                  >
                    {(cert.employee_name ?? cert.employee?.name) ? (
                      <div className="text-sm">
                        <div className="font-medium">{cert.employee_name ?? cert.employee?.name}</div>
                        <div className="text-muted-foreground">{cert.employee_code ?? cert.employee?.employee_code ?? "-"}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{cert.issued_by}</TableCell>
                  <TableCell>
                    {cert.issue_date ? formatDate(cert.issue_date) : "-"}
                  </TableCell>
                  <TableCell>{getExpiryBadge(cert)}</TableCell>
                  <TableCell>
                    {(canUpdate || canDelete || canView) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem onClick={() => handleView(cert)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => handleEdit(cert)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(cert.id)}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {canCreate && (
        <CertificationForm
          open={isFormOpen}
          onClose={handleFormClose}
          certificationId={editingCertificationId}
        />
      )}

      {canView && viewingCertification && (
        <CertificationDetailModal
          open={!!viewingCertification}
          onClose={() => setViewingCertification(null)}
          certification={viewingCertification}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete.title")}
          description={t("delete.confirm_message")}
          itemName={t("common.certification")}
          isLoading={deleteCertification.isPending}
        />
      )}
    </div>
  );
}
