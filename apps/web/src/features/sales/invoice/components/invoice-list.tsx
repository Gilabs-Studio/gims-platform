"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, DollarSign, XCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useInvoices, useDeleteInvoice, useUpdateInvoiceStatus } from "../hooks/use-invoices";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { InvoiceForm } from "./invoice-form";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import type { CustomerInvoice, CustomerInvoiceStatus } from "../types";
import { formatCurrency } from "@/lib/utils";

export function InvoiceList() {
  const t = useTranslations("invoice");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CustomerInvoiceStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<CustomerInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<CustomerInvoice | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useInvoices({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("customer_invoice.create");
  const canUpdate = useUserPermission("customer_invoice.update");
  const canDelete = useUserPermission("customer_invoice.delete");
  const canView = useUserPermission("customer_invoice.read");

  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const invoices = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (invoice: CustomerInvoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleView = (invoice: CustomerInvoice) => {
    setViewingInvoice(invoice);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteInvoice.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingInvoice(null);
  };

  const handleStatusChange = async (
    id: string,
    status: CustomerInvoiceStatus,
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const isOverdue = (invoice: CustomerInvoice) => {
    if (invoice.status === "paid" || invoice.status === "cancelled") return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  const getStatusBadge = (invoice: CustomerInvoice) => {
    const status = invoice.status;
    const overdue = isOverdue(invoice);

    if (overdue && status !== "paid" && status !== "cancelled") {
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t("overdue")}
        </Badge>
      );
    }

    switch (status) {
      case "unpaid":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.unpaid")}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="default" className="bg-amber-600">
            <DollarSign className="h-3 w-3 mr-1" />
            {t("status.partial")}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.paid")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
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
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as CustomerInvoiceStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("common.status")}</SelectItem>
            <SelectItem value="unpaid">{t("status.unpaid")}</SelectItem>
            <SelectItem value="partial">{t("status.partial")}</SelectItem>
            <SelectItem value="paid">{t("status.paid")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
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
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("invoiceDate")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>{t("salesOrder")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("totalAmount")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => canView && handleView(invoice)}>
                    {invoice.code}
                  </TableCell>
                  <TableCell>
                    {invoice.invoice_date
                      ? new Date(invoice.invoice_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {invoice.due_date
                      ? new Date(invoice.due_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>{invoice.sales_order?.code ?? "-"}</TableCell>
                  <TableCell>{getStatusBadge(invoice)}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount ?? 0)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleView(invoice)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && invoice.status === "unpaid" && (
                            <DropdownMenuItem onClick={() => handleEdit(invoice)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (invoice.status === "unpaid" || invoice.status === "partial") && (
                            <DropdownMenuItem
                              onClick={() => handleView(invoice)}
                              className="cursor-pointer"
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              {t("actions.pay")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && invoice.status === "unpaid" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(invoice.id, "cancelled")}
                              className="cursor-pointer text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.cancel")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && invoice.status === "unpaid" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(invoice.id)}
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

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.page")} {pagination.page} {t("common.of")} {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer"
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

      {canCreate && (
        <InvoiceForm
          open={isFormOpen}
          onClose={handleFormClose}
          invoice={editingInvoice}
        />
      )}

      {canView && viewingInvoice && (
        <InvoiceDetailModal
          open={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.invoice")}
          isLoading={deleteInvoice.isPending}
        />
      )}
    </div>
  );
}
