"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Briefcase,
  Ban,
  Lock,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import {
  useRecruitmentRequests,
  useDeleteRecruitmentRequest,
  useUpdateRecruitmentStatus,
} from "../hooks/use-recruitment";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatDate } from "@/lib/utils";
import { RecruitmentForm } from "./recruitment-form";
import { RecruitmentOverview } from "./recruitment-overview";
import type { RecruitmentRequest, RecruitmentStatus } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function RecruitmentList() {
  const t = useTranslations("recruitment");
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<RecruitmentStatus | "all">(
    "all"
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] =
    useState<RecruitmentRequest | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<"card" | "list">("card");

  const { data, isLoading, isError } = useRecruitmentRequests({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("recruitment.create");
  const canUpdate = useUserPermission("recruitment.update");
  const canDelete = useUserPermission("recruitment.delete");
  const canView = useUserPermission("recruitment.read");
  const canApprove = useUserPermission("recruitment.approve");

  const deleteRequest = useDeleteRecruitmentRequest();
  const updateStatus = useUpdateRecruitmentStatus();
  const requests = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (request: RecruitmentRequest) => {
    setEditingRequest(request);
    setIsFormOpen(true);
  };

  const handleView = (request: RecruitmentRequest) => {
    router.push(`/hrd/recruitment/${request.id}`, { locale });
  };

  const handleViewApplicants = (request: RecruitmentRequest) => {
    router.push(`/hrd/recruitment/${request.id}?tab=applicants`, { locale });
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteRequest.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRequest(null);
  };

  const handleStatusChange = async (
    id: string,
    status: RecruitmentStatus,
    notes?: string
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status, notes },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: RecruitmentStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      case "OPEN":
        return (
          <Badge variant="info">
            <Briefcase className="h-3 w-3 mr-1" />
            {t("status.open")}
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary">
            <Lock className="h-3 w-3 mr-1" />
            {t("status.closed")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "LOW":
        return <Badge variant="secondary">{t("priority.low")}</Badge>;
      case "MEDIUM":
        return <Badge variant="outline">{t("priority.medium")}</Badge>;
      case "HIGH":
        return <Badge variant="warning">{t("priority.high")}</Badge>;
      case "URGENT":
        return <Badge variant="destructive">{t("priority.urgent")}</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
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

      <Tabs value={view} onValueChange={(v) => setView(v as "card" | "list")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as RecruitmentStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("common.filterBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("common.filterBy")} {t("common.status")}
              </SelectItem>
              <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
              <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
              <SelectItem value="APPROVED">{t("status.approved")}</SelectItem>
              <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
              <SelectItem value="OPEN">{t("status.open")}</SelectItem>
              <SelectItem value="CLOSED">{t("status.closed")}</SelectItem>
              <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="card" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                {t("views.card")}
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                {t("views.list")}
              </TabsTrigger>
            </TabsList>
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
        </div>

        <TabsContent value="card" className="mt-6">
          <RecruitmentOverview
            requests={requests}
            isLoading={isLoading}
            onRequestClick={handleView}
            searchTerm={search}
          />
          {pagination && requests.length > 0 && (
            <div className="mt-6">
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requestCode")}</TableHead>
                  <TableHead>{t("requestDate")}</TableHead>
                  <TableHead>{t("division")}</TableHead>
                  <TableHead>{t("position")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("priority.label")}</TableHead>
                  <TableHead>{t("openPositions")}</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("notFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell
                        className="font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => canView && handleView(request)}
                      >
                        {request.request_code}
                      </TableCell>
                      <TableCell>
                        {request.request_date
                          ? new Date(request.request_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>{request.division_name ?? "-"}</TableCell>
                      <TableCell>{request.position_name ?? "-"}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {request.filled_count}/{request.required_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(canUpdate || canDelete || canView || canApprove) && (
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
                                  onClick={() => handleView(request)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t("common.view")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate &&
                                (request.status === "DRAFT" ||
                                  request.status === "REJECTED") && (
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(request)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                )}
                              {canUpdate &&
                                (request.status === "DRAFT" ||
                                  request.status === "REJECTED") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(request.id, "PENDING")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    {request.status === "REJECTED"
                                      ? t("actions.resubmit")
                                      : t("actions.submit")}
                                  </DropdownMenuItem>
                                )}
                              {canApprove && request.status === "PENDING" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(request.id, "APPROVED")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {t("actions.approve")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(request.id, "REJECTED")
                                    }
                                    className="cursor-pointer text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t("actions.reject")}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canUpdate && request.status === "APPROVED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(request.id, "OPEN")
                                  }
                                  className="cursor-pointer"
                                >
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  {t("actions.open")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate && request.status === "OPEN" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(request.id, "CLOSED")
                                  }
                                  className="cursor-pointer"
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  {t("actions.close")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate &&
                                (request.status === "DRAFT" ||
                                  request.status === "PENDING") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(request.id, "CANCELLED")
                                    }
                                    className="cursor-pointer text-destructive"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {t("actions.cancelRequest")}
                                  </DropdownMenuItem>
                                )}
                              {canDelete && request.status === "DRAFT" && (
                                <DropdownMenuItem
                                  onClick={() => setDeletingId(request.id)}
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
        </TabsContent>
      </Tabs>

      {(canCreate || canUpdate) && (
        <RecruitmentForm
          open={isFormOpen}
          onClose={handleFormClose}
          recruitmentRequest={editingRequest}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("title")}
          isLoading={deleteRequest.isPending}
        />
      )}
    </div>
  );
}
