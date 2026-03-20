"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, CheckCircle2, Clock, FileText, MoreHorizontal, Pencil, Plus, Search, Trash2, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { NonTradePayable } from "../types";
import {
  useDeleteFinanceNonTradePayable,
  useFinanceNonTradePayables,
  useSubmitFinanceNonTradePayable,
  useApproveFinanceNonTradePayable,
  useRejectFinanceNonTradePayable,
} from "../hooks/use-finance-non-trade-payables";
import { NonTradePayableForm } from "./non-trade-payable-form";
import { PayNonTradePayableDialog } from "./pay-dialog";

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "approved":
    case "confirmed":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    case "paid":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <Send className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    case "cancelled":
    case "rejected":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    case "unpaid":
    case "overdue":
      return (
        <Badge variant="warning" className="text-xs font-medium">
          <Clock className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <Clock className="h-3 w-3 mr-1" />
          {t(`status.${normalized}`)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {status}
        </Badge>
      );
  }
}

export function NonTradePayablesList() {
  const t = useTranslations("financeNonTradePayables");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("non_trade_payable.create");
  const canUpdate = useUserPermission("non_trade_payable.update");
  const canSubmit = useUserPermission("non_trade_payable.submit");
  const canDelete = useUserPermission("non_trade_payable.delete");
  const canApprove = useUserPermission("non_trade_payable.approve");
  const canReject = useUserPermission("non_trade_payable.reject");
  const canPay = useUserPermission("non_trade_payable.pay");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<NonTradePayable | null>(null);
  const [deleting, setDeleting] = useState<NonTradePayable | null>(null);
  const [paying, setPaying] = useState<NonTradePayable | null>(null);

  const { data, isLoading, isError } = useFinanceNonTradePayables({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "transaction_date",
    sort_dir: "desc",
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.meta?.pagination;
  const deleteMutation = useDeleteFinanceNonTradePayable();
  const submitMutation = useSubmitFinanceNonTradePayable();
  const approveMutation = useApproveFinanceNonTradePayable();
  const rejectMutation = useRejectFinanceNonTradePayable();

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleSubmit = async (id: string) => {
    try {
      await submitMutation.mutateAsync(id);
      toast.success(t("toast.submitted"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("toast.approved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync(id);
      toast.success(t("toast.rejected"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {canCreate && (
          <Button
            onClick={() => {
              setFormMode("create");
              setEditing(null);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
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
        <div className="flex-1" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.code")}</TableHead>
              <TableHead>{t("fields.transactionDate")}</TableHead>
              <TableHead>{t("fields.vendorName")}</TableHead>
              <TableHead>{t("fields.amount")}</TableHead>
              <TableHead>{t("fields.dueDate")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => {
                const normalizedStatus = item.status?.toLowerCase() ?? "";
                const isDraft = normalizedStatus === "draft";
                const isSubmitted = normalizedStatus === "submitted";
                const isApproved = normalizedStatus === "approved";

                return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(item.transaction_date)}</TableCell>
                  <TableCell>{item.vendor_name || "-"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.amount)}</TableCell>
                  <TableCell className="tabular-nums">{item.due_date ? formatDate(item.due_date) : "-"}</TableCell>
                  <TableCell>
                    {getStatusBadge(item.status, t)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isDraft && canUpdate && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setFormMode("edit");
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {isDraft && canSubmit && (
                          <DropdownMenuItem
                            className="cursor-pointer text-primary focus:text-primary"
                            onClick={() => handleSubmit(item.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {t("actions.submit")}
                          </DropdownMenuItem>
                        )}
                        {isSubmitted && canApprove && (
                          <DropdownMenuItem
                            className="cursor-pointer text-success focus:text-success"
                            onClick={() => handleApprove(item.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("actions.approve")}
                          </DropdownMenuItem>
                        )}
                        {isSubmitted && canReject && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => handleReject(item.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t("actions.reject")}
                          </DropdownMenuItem>
                        )}
                        {isApproved && canPay && (
                          <DropdownMenuItem
                            className="cursor-pointer text-success focus:text-success"
                            onClick={() => setPaying(item)}
                          >
                            <Banknote className="h-4 w-4 mr-2" />
                            {t("actions.pay")}
                          </DropdownMenuItem>
                        )}
                        {isDraft && canDelete && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? rows.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <NonTradePayableForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} initialData={editing} />

      <PayNonTradePayableDialog
        open={!!paying}
        onOpenChange={(open) => {
          if (!open) setPaying(null);
        }}
        item={paying}
      />

      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("actions.delete")}
        description=""
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          const id = deleting?.id ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeleting(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
      />
    </div>
  );
}
