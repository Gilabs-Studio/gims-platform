"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Printer,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { CustomerInvoiceDPPrintDialog } from "./customer-invoice-dp-print-dialog";
import { CustomerInvoiceDPDetailModal } from "./customer-invoice-dp-detail-modal";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import type { SalesOrder } from "@/features/sales/order/types";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useDeleteCustomerInvoiceDP,
  usePendingCustomerInvoiceDP,
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

function DueDateCell({ dueDate, status }: { dueDate?: string; status: string }) {
  const st = (status ?? "").toLowerCase();
  const isSettled = st === "paid" || st === "cancelled" || st === "rejected";

  if (!dueDate) return <span className="text-sm text-muted-foreground">—</span>;

  const formatted = formatDate(dueDate);
  if (isSettled) return <span className="text-sm text-muted-foreground">{formatted}</span>;

  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{formatted}</span>
        <div className="flex items-center gap-1 text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="text-xs font-semibold">{Math.abs(diffDays)}d overdue</span>
        </div>
      </div>
    );
  }
  if (diffDays === 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{formatted}</span>
        <span className="text-xs font-semibold text-amber-500">Due today</span>
      </div>
    );
  }
  if (diffDays <= 7) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{formatted}</span>
        <span className="text-xs font-medium text-amber-500">{diffDays}d left</span>
      </div>
    );
  }
  return <span className="text-sm">{formatted}</span>;
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

  const [deletingRow, setDeletingRow] = useState<CustomerInvoiceDPListItem | null>(null);
  const [printingDPId, setPrintingDPId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [selectedSOId, setSelectedSOId] = useState<string | null>(null);

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
  const canPrint = useUserPermission("customer_invoice_dp.print");
  const canViewCustomer = useUserPermission("customer.read");
  const canViewSalesOrder = useUserPermission("sales_order.read");

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
      toast.success(t("toast.submitted"));
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const canShowActions =
    canUpdate || canPending || canDelete || canPrint;

  const getStatusBadge = (status: CustomerInvoiceDPStatus) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <Clock className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Clock className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="text-xs font-medium text-muted-foreground">
            <Ban className="h-3 w-3" />
            {statusLabel(t, status)}
          </Badge>
        );
      case "draft":
      default:
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="h-3 w-3" />
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
              <TableHead>{t("columns.customer")}</TableHead>
              <TableHead>{t("columns.relatedInvoiceCode")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              <TableHead className="text-right">{t("columns.remainingAmount")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
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
                  <TableCell className="font-medium">
                    <button
                      className="font-mono font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => { setDetailId(row.id); setDetailOpen(true); }}
                    >
                      {row.code}
                    </button>
                  </TableCell>
                  <TableCell>{safeDate(row.invoice_date)}</TableCell>
                  <TableCell>
                    <DueDateCell dueDate={row.due_date ?? undefined} status={row.status} />
                  </TableCell>
                  <TableCell>
                    {row.sales_order?.id ? (
                      canViewSalesOrder ? (
                        <button
                          className="font-mono text-primary hover:underline cursor-pointer text-sm font-medium"
                          onClick={() => setSelectedSOId(row.sales_order!.id)}
                        >
                          {row.sales_order.code}
                        </button>
                      ) : (
                        <span className="font-mono text-sm">{row.sales_order.code}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.sales_order?.customer_id ? (
                      canViewCustomer ? (
                        <button
                          className="text-primary hover:underline cursor-pointer text-sm font-medium"
                          onClick={() =>
                            setSelectedCustomer({
                              id: row.sales_order!.customer_id as string,
                              name: row.sales_order?.customer_name ?? "",
                            })
                          }
                        >
                          {row.sales_order.customer_name || "-"}
                        </button>
                      ) : (
                        <span className="text-sm">{row.sales_order.customer_name || "-"}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
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
                  {canShowActions ? (
                    <TableCell>
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

                          {canPending && normalizeStatus(row.status) === "draft" ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handlePending(row.id)}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
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
                          {canPrint ? (
                            <DropdownMenuItem
                              className="cursor-pointer text-violet-600 focus:text-violet-600"
                              onClick={() => setPrintingDPId(row.id)}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              {tCommon("print")}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
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

      <CustomerInvoiceDPDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        id={detailId}
      />

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

      {printingDPId && (
        <CustomerInvoiceDPPrintDialog
          open={!!printingDPId}
          onClose={() => setPrintingDPId(null)}
          invoiceDpId={printingDPId}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          open={!!selectedCustomer}
          onOpenChange={(open) => {
            if (!open) setSelectedCustomer(null);
          }}
          customer={selectedCustomer as never}
        />
      )}

      {selectedSOId && (
        <OrderDetailModal
          open={!!selectedSOId}
          onClose={() => setSelectedSOId(null)}
          order={{ id: selectedSOId } as unknown as SalesOrder}
        />
      )}
    </div>
  );
}
