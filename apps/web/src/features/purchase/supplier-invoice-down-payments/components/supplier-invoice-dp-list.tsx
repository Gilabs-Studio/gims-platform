"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Download,
  Eye,
  FileText,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  useDeleteSupplierInvoiceDP,
  usePendingSupplierInvoiceDP,
  useSupplierInvoiceDP,
  useSupplierInvoiceDPs,
} from "../hooks/use-supplier-invoice-dp";
import { PurchaseOrderDetail } from "../../orders/components/purchase-order-detail";
import { SupplierInvoiceDetail } from "../../supplier-invoices/components/supplier-invoice-detail";
import { supplierInvoiceDPService } from "../services/supplier-invoice-dp-service";
import type { SupplierInvoiceDPListItem } from "../types";
import { SupplierInvoiceDownPaymentStatusBadge } from "./supplier-invoice-down-payment-status-badge";

const SupplierInvoiceDPFormDialog = dynamic(
  () => import("./supplier-invoice-dp-form").then((m) => m.SupplierInvoiceDPFormDialog),
  { ssr: false },
);

export function SupplierInvoiceDPList() {
  const t = useTranslations("supplierInvoiceDP");
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

  const [deletingRow, setDeletingRow] = useState<SupplierInvoiceDPListItem | null>(null);

  const [isRegularInvoiceOpen, setIsRegularInvoiceOpen] = useState(false);
  const [selectedRegularInvoiceId, setSelectedRegularInvoiceId] = useState<string | null>(null);

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

  const { data, isLoading, isError } = useSupplierInvoiceDPs(listParams);

  const deleteMutation = useDeleteSupplierInvoiceDP();
  const pendingMutation = usePendingSupplierInvoiceDP();

  const canCreate = useUserPermission("supplier_invoice_dp.create");
  const canUpdate = useUserPermission("supplier_invoice_dp.update");
  const canDelete = useUserPermission("supplier_invoice_dp.delete");
  const canPending = useUserPermission("supplier_invoice_dp.pending");
  const canExport = useUserPermission("supplier_invoice_dp.export");
  const canAuditTrail = useUserPermission("supplier_invoice_dp.audit_trail");
  const canView = useUserPermission("supplier_invoice_dp.read");

  async function handleExport() {
    try {
      const blob = await supplierInvoiceDPService.exportCsv(listParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "supplier-invoice-down-payments.csv";
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
              <TableHead>{t("columns.regularInvoice")}</TableHead>
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
                  <TableCell>
                    {row.regular_invoices && row.regular_invoices.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {row.regular_invoices.map((reg) => (
                          <span
                            key={reg.id}
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRegularInvoiceId(reg.id);
                              setIsRegularInvoiceOpen(true);
                            }}
                          >
                            {reg.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(row.invoice_date)}</TableCell>
                  <TableCell>{formatDate(row.due_date)}</TableCell>
                  <TableCell>{row.purchase_order?.code ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>
                    <SupplierInvoiceDownPaymentStatusBadge status={row.status} />
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

      <SupplierInvoiceDPFormDialog
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
          {detailId ? (
            <SupplierInvoiceDPDetailView
              id={detailId}
              onClose={() => {
                setDetailOpen(false);
                setDetailId(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Regular Invoice Detail Modal */}
      <SupplierInvoiceDetail
        open={isRegularInvoiceOpen}
        invoiceId={selectedRegularInvoiceId}
        onClose={() => {
          setIsRegularInvoiceOpen(false);
          setSelectedRegularInvoiceId(null);
        }}
      />

      {/* Audit Trail Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("auditTrail.title")}</DialogTitle>
          </DialogHeader>
          {auditId ? <SupplierInvoiceDPAuditTrailView id={auditId} /> : null}
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deletingRow}
        onOpenChange={(v) => !v && setDeletingRow(null)}
        itemName={tCommon("supplierInvoiceDP") || "supplier invoice down payment"}
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

/* ───────────────────── Detail View ───────────────────── */

function SupplierInvoiceDPDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations("supplierInvoiceDP");
  const { data, isLoading, isError } = useSupplierInvoiceDP(id, { enabled: !!id });

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
  if (isError || !data?.success)
    return <div className="text-sm text-destructive">{t("detail.failed")}</div>;

  const row = data.data;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{row.invoice_number}</h3>
          <p className="text-sm text-muted-foreground font-mono">{row.code}</p>
        </div>
        <div className="text-right">
          <SupplierInvoiceDownPaymentStatusBadge status={row.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-muted-foreground">{t("fields.purchaseOrder")}</p>
          <p className="font-mono font-medium text-primary">{row.purchase_order?.code ?? "-"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">{t("fields.invoiceDate")}</p>
          <p className="font-medium">{formatDate(row.invoice_date)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">{t("fields.dueDate")}</p>
          <p className="font-medium">{formatDate(row.due_date)}</p>
        </div>
        {row.regular_invoices && row.regular_invoices.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("columns.regularInvoice")}</p>
            <div className="flex flex-wrap gap-2">
              {row.regular_invoices.map((reg) => (
                <Badge key={reg.id} variant="outline" className="font-mono text-primary border-primary/20">
                  {reg.code}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {row.notes ? (
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("fields.notes")}</p>
            <p className="font-medium">{row.notes}</p>
          </div>
        ) : null}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-4 flex justify-between items-center px-6 bg-muted/20">
          <span className="font-semibold">{t("fields.amount")}</span>
          <span className="font-mono font-bold text-xl">{formatCurrency(row.amount)}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Audit Trail View ───────────────────── */

function SupplierInvoiceDPAuditTrailView({ id }: { id: string }) {
  const t = useTranslations("supplierInvoiceDP");
  const tCommon = useTranslations("common");

  const { data, isLoading, isError } = useSupplierInvoiceDP(id, { enabled: !!id });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;

  return (
    <div className="text-center py-8 text-muted-foreground">
      {t("auditTrail.empty")}
    </div>
  );
}
