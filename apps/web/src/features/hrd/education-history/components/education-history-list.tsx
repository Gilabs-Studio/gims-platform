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
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  GraduationCap,
} from "lucide-react";
import {
  useEducationHistories,
  useDeleteEducationHistory,
} from "../hooks/use-education-history";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EducationHistoryForm } from "@/features/hrd/education-history/components/education-history-form";
import { EducationHistoryDetailModal } from "@/features/hrd/education-history/components/education-history-detail-modal";
import type { EmployeeEducationHistory, DegreeLevel } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function EducationHistoryList() {
  const t = useTranslations("educationHistory");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [degreeFilter, setDegreeFilter] = useState<DegreeLevel | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEducation, setEditingEducation] =
    useState<EmployeeEducationHistory | null>(null);
  const [viewingEducation, setViewingEducation] =
    useState<EmployeeEducationHistory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEducationHistories({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    degree: degreeFilter !== "all" ? degreeFilter : undefined,
  });

  const canCreate = useUserPermission("education_history.create");
  const canUpdate = useUserPermission("education_history.update");
  const canDelete = useUserPermission("education_history.delete");
  const canView = useUserPermission("education_history.read");

  const deleteEducation = useDeleteEducationHistory();
  const educations = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (education: EmployeeEducationHistory) => {
    setEditingEducation(education);
    setIsFormOpen(true);
  };

  const handleView = (education: EmployeeEducationHistory) => {
    setViewingEducation(education);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteEducation.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEducation(null);
  };

  const getDegreeBadge = (degree: DegreeLevel) => {
    const variants: Record<
      DegreeLevel,
      "default" | "secondary" | "success" | "info"
    > = {
      ELEMENTARY: "secondary",
      JUNIOR_HIGH: "secondary",
      SENIOR_HIGH: "default",
      DIPLOMA: "info",
      BACHELOR: "info",
      MASTER: "success",
      DOCTORATE: "success",
    };

    return (
      <Badge variant={variants[degree]}>
        <GraduationCap className="h-3 w-3 mr-1" />
        {t(`degrees.${degree}`)}
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
          value={degreeFilter}
          onValueChange={(v) => {
            setDegreeFilter(v as DegreeLevel | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.selectDegree")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allDegrees")}</SelectItem>
            <SelectItem value="ELEMENTARY">
              {t("degrees.ELEMENTARY")}
            </SelectItem>
            <SelectItem value="JUNIOR_HIGH">
              {t("degrees.JUNIOR_HIGH")}
            </SelectItem>
            <SelectItem value="SENIOR_HIGH">
              {t("degrees.SENIOR_HIGH")}
            </SelectItem>
            <SelectItem value="DIPLOMA">{t("degrees.DIPLOMA")}</SelectItem>
            <SelectItem value="BACHELOR">{t("degrees.BACHELOR")}</SelectItem>
            <SelectItem value="MASTER">{t("degrees.MASTER")}</SelectItem>
            <SelectItem value="DOCTORATE">{t("degrees.DOCTORATE")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("employee")}</TableHead>
              <TableHead>{t("institution")}</TableHead>
              <TableHead>{t("degree")}</TableHead>
              <TableHead>{t("fieldOfStudy")}</TableHead>
              <TableHead>{t("startDate")}</TableHead>
              <TableHead>{t("isCompleted")}</TableHead>
              <TableHead className="w-20">
                {t("common.actions")}
              </TableHead>
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
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : educations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              educations.map((education) => (
                <TableRow key={education.id}>
                  <TableCell className="font-medium">
                    {education.employee_id}
                  </TableCell>
                  <TableCell>{education.institution}</TableCell>
                  <TableCell>{getDegreeBadge(education.degree)}</TableCell>
                  <TableCell>
                    {education.field_of_study || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(education.start_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {education.is_completed ? (
                      <Badge variant="success">{t("common.completed")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("common.ongoing")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canView && (
                          <DropdownMenuItem
                            onClick={() => handleView(education)}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t("common.view")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && (
                          <DropdownMenuItem
                            onClick={() => handleEdit(education)}
                            className="cursor-pointer"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeletingId(education.id)}
                            className="cursor-pointer text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
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

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {isFormOpen && (
        <EducationHistoryForm
          open={isFormOpen}
          onClose={handleFormClose}
          educationHistory={editingEducation}
        />
      )}

      {viewingEducation && (
        <EducationHistoryDetailModal
          open={!!viewingEducation}
          onClose={() => setViewingEducation(null)}
          educationHistory={viewingEducation}
        />
      )}

      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteEducation.isPending}
      />
    </div>
  );
}
