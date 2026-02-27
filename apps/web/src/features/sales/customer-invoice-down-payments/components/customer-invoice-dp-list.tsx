"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Download,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/utils";

import {
  useDeleteCustomerInvoiceDP,
  usePendingCustomerInvoiceDP,
  useCustomerInvoiceDP,
  useCustomerInvoiceDPs,
} from "../hooks/use-customer-invoice-dp";
import { customerInvoiceDPService } from "../services/customer-invoice-dp-service";
import type { CustomerInvoiceDPListItem, CustomerInvoiceDPStatus } from "../types";

const CustomerInvoiceDPFormDialog = dynamic(
  () => import("./customer-invoice-dp-form").then((m) => m.CustomerInvoiceDPFormDialog),
  { ssr: false },
);

function statusLabel(t: ReturnType<typeof useTranslations>, status: CustomerInvoiceDPStatus) {
  return t(`status.${status.toLowerCase()}`);
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toLowerCase();
}

export function CustomerInvoiceDPList() {
  const t = useTranslations("customerInvoiceDP");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);

  const [deletingRow, setDeletingRow] = useState<CustomerInvoiceDPListItem | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      sort_by: "created_at",
      sort_dir: "desc",
    }),
    [page, pageSize, debouncedSearch],
  );
  const { data, isLoading, isError } = useCustomerInvoiceDPs(listParams);

  const deleteMutation = useDeleteCustomerInvoiceDP();
  const pendingMutation = usePendingCustomerInvoiceDP();

  const canCreate = useUserPermission("customer_invoice_dp.create");
  const canUpdate = useUserPermission("customer_invoice_dp.update");
  const canDelete = useUserPermission("customer_invoice_dp.delete");
  const canPending = useUserPermission("customer_invoice_dp.pending");
  const canExport = useUserPermission("customer_invoice_dp.export");
  const canAuditTrail = useUserPermission("customer_invoice_dp.audit_trail");

  async function handleExport() {
    try {
      const blob = await customerInvoiceDPService.exportCsv(listParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customer-invoice-down-payments.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  async function handleDelete() {
    if (!deletingRow?.id) return;
    try {
      const response = await deleteMutation.mutateAsync(deletingRow.id);
      if (!response.success) throw new Error(response.error ?? "delete_failed");
      toast.success(t("toast.deleted"));
      setDeletingRow(null);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  async function handlePending(id: string) {
    try {
      const response = await pendingMutation.mutateAsync(id);
      if (!response.success) throw new Error(response.error ?? "pending_failed");
      toast.success(t("toast.pending"));
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const canShowActions =
    canUpdate || canPending || canAuditTrail || canDelete;

  const getStatusBadge = (status: CustomerInvoiceDPStatus) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return (
          <Badge variant="success" className="text-xs font-medium">
            {statusLabel(t, status)}
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            {statusLabel(t, status)}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            {statusLabel(t, status)}
          </Badge>
        );
      case "draft":
      default:
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            {statusLabel(t, status)}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
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

        {canExport ? (
          <Button variant="outline" onClick={handleExport} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("actions.export")}
          </Button>
        ) : null}

        {canCreate ? (
          <Button
            onClick={() => {
              setEditId(undefined);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        ) : null}
      </div>

      {isError ? (
        <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.invoiceDate")}</TableHead>
              <TableHead>{t("columns.dueDate")}</TableHead>
              <TableHead>{t("columns.salesOrder")}</TableHead>
              <TableHead>{t("columns.relatedInvoiceCode")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              <TableHead className="text-right">{t("columns.remainingAmount")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
              {canShowActions ? <TableHead className="w-[70px]" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canShowActions ? 10 : 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canShowActions ? 10 : 9}
                  className="h-24 text-center text-muted-foreground"
                >
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{safeDate(row.invoice_date)}</TableCell>
                  <TableCell>{safeDate(row.due_date)}</TableCell>
                  <TableCell>{row.sales_order?.code ?? "-"}</TableCell>
                  <TableCell>
                    {row.related_invoice_code ? (
                      <Badge variant="outline" className="font-mono">
                        {row.related_invoice_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">{tCommon('empty').replace(/.*No.*/i, '-')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.remaining_amount ?? row.amount)}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="flex items-center justify-between gap-2">
                    <span>{safeDate(row.created_at)}</span>

                    {canShowActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setDetailId(row.id);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.view")}
                          </DropdownMenuItem>

                          {canUpdate ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setEditId(row.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                          ) : null}

                          {canPending ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handlePending(row.id)}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              {t("actions.pending")}
                            </DropdownMenuItem>
                          ) : null}

                          {canAuditTrail ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setAuditId(row.id);
                                setAuditOpen(true);
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              {t("actions.auditTrail")}
                            </DropdownMenuItem>
                          ) : null}

                          {canDelete ? (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => setDeletingRow(row)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tCommon("delete")}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

      <CustomerInvoiceDPFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoiceId={editId}
      />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>
          {detailId ? <CustomerInvoiceDPDetailView id={detailId} /> : null}
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("auditTrail.title")}</DialogTitle>
          </DialogHeader>
          {auditId ? <CustomerInvoiceDPAuditTrailView id={auditId} /> : null}
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deletingRow}
        onOpenChange={(v) => {
          if (!v) setDeletingRow(null);
        }}
        title={tCommon("delete")}
        description={tCommon("deleteConfirm")}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

/* ───────────────────── Detail View ───────────────────── */

function CustomerInvoiceDPDetailView({ id }: { id: string }) {
  const t = useTranslations("customerInvoiceDP");
  const tCommon = useTranslations("common");
  const { data, isLoading, isError } = useCustomerInvoiceDP(id, { enabled: !!id });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data?.success)
    return <div className="text-center py-8 text-destructive">{t("detail.failed")}</div>;

  const row = data.data;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted-foreground">{t("columns.code")}</div>
        <div className="font-semibold text-lg">{row.code}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.salesOrder")}</div>
          <div className="font-medium">{row.sales_order?.code ?? "-"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.amount")}</div>
          <div className="font-medium">{formatCurrency(row.amount)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.invoiceDate")}</div>
          <div className="font-medium">{safeDate(row.invoice_date)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.dueDate")}</div>
          <div className="font-medium">{safeDate(row.due_date)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.status")}</div>
          <div className="font-medium">
            <Badge
              variant={normalizeStatus(row.status) === "paid" ? "success" : "secondary"}
              className="text-xs"
            >
              {statusLabel(t, row.status)}
            </Badge>
          </div>
        </div>
      </div>

      {row.notes ? (
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.notes")}</div>
          <div className="whitespace-pre-wrap text-sm">{row.notes}</div>
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────── Audit Trail View ───────────────────── */

function CustomerInvoiceDPAuditTrailView({ id }: { id: string }) {
  const t = useTranslations("customerInvoiceDP");
  const tCommon = useTranslations("common");

  const { data, isLoading, isError } = useCustomerInvoiceDP(id, { enabled: !!id });

  // For now, use a simple placeholder – can be enhanced with a dedicated audit trail hook later
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;

  return (
    <div className="text-center py-8 text-muted-foreground">
      {t("auditTrail.empty")}
    </div>
  );
}
