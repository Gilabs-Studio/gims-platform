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
import { toast } from "sonner";

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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useDeleteSupplierInvoice,
  usePendingSupplierInvoice,
  useSupplierInvoices,
} from "../hooks/use-supplier-invoices";
import { supplierInvoicesService } from "../services/supplier-invoices-service";
import type { SupplierInvoiceListItem } from "../types";
import { SupplierInvoiceAuditTrail } from "./supplier-invoice-audit-trail";
import { SupplierInvoiceDetail } from "./supplier-invoice-detail";
import { SupplierInvoiceStatusBadge } from "./supplier-invoice-status-badge";

const SupplierInvoiceFormDialog = dynamic(
  () => import("./supplier-invoice-form").then((m) => m.SupplierInvoiceFormDialog),
  { ssr: false },
);

export function SupplierInvoicesList() {
  const t = useTranslations("supplierInvoice");
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

  const [deletingRow, setDeletingRow] = useState<SupplierInvoiceListItem | null>(null);

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

  const { data, isLoading, isError } = useSupplierInvoices(listParams);

  const deleteMutation = useDeleteSupplierInvoice();
  const pendingMutation = usePendingSupplierInvoice();

  const canCreate = useUserPermission("supplier_invoice.create");
  const canUpdate = useUserPermission("supplier_invoice.update");
  const canDelete = useUserPermission("supplier_invoice.delete");
  const canPending = useUserPermission("supplier_invoice.pending");
  const canExport = useUserPermission("supplier_invoice.export");
  const canAuditTrail = useUserPermission("supplier_invoice.audit_trail");
  const canView = useUserPermission("supplier_invoice.read");

  async function handleExport() {
    try {
      const blob = await supplierInvoicesService.exportCsv(listParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "supplier-invoices.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const canShowActions =
    canUpdate || canPending || canAuditTrail || canDelete || canView;

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
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

        {canExport && (
          <Button variant="outline" onClick={handleExport} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("actions.export")}
          </Button>
        )}

        {canCreate && (
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
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.invoiceNumber")}</TableHead>
              <TableHead>{t("columns.invoiceDate")}</TableHead>
              <TableHead>{t("columns.dueDate")}</TableHead>
              <TableHead>{t("columns.purchaseOrder")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => canView && handleView(row.id)}
                  >
                    {row.code}
                  </TableCell>
                  <TableCell>{row.invoice_number}</TableCell>
                  <TableCell>{formatDate(row.invoice_date)}</TableCell>
                  <TableCell>{formatDate(row.due_date)}</TableCell>
                  <TableCell>{row.purchase_order?.code ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>
                    <SupplierInvoiceStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(row.created_at)}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canShowActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleView(row.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("actions.view")}
                            </DropdownMenuItem>
                          )}

                          {canUpdate && (row.status ?? "").toLowerCase() === "draft" && (
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
                          )}

                          {canPending && (row.status ?? "").toLowerCase() === "draft" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                              onClick={async () => {
                                try {
                                  await pendingMutation.mutateAsync(row.id);
                                  toast.success(t("toast.pending"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              {t("actions.pending")}
                            </DropdownMenuItem>
                          )}

                          {canAuditTrail && (
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
                          )}

                          {canDelete && (row.status ?? "").toLowerCase() === "draft" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => setDeletingRow(row)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tCommon("delete")}
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
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <SupplierInvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoiceId={editId}
      />

      <SupplierInvoiceDetail
        open={detailOpen}
        invoiceId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
      />

      <SupplierInvoiceAuditTrail
        open={auditOpen}
        invoiceId={detailId || auditId}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
      />

      <DeleteDialog
        open={!!deletingRow}
        onOpenChange={(v) => !v && setDeletingRow(null)}
        itemName={tCommon("supplierInvoice") || "supplier invoice"}
        onConfirm={async () => {
          if (!deletingRow) return;
          try {
            await deleteMutation.mutateAsync(deletingRow.id);
            toast.success(t("toast.deleted"));
          } catch {
            toast.error(t("toast.failed"));
          } finally {
            setDeletingRow(null);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
