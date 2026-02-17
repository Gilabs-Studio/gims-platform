"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";

import {
  useDeleteSupplierInvoiceDP,
  usePendingSupplierInvoiceDP,
  useSupplierInvoiceDP,
  useSupplierInvoiceDPs,
} from "../hooks/use-supplier-invoice-dp";
import { supplierInvoiceDPService } from "../services/supplier-invoice-dp-service";
import type { SupplierInvoiceDPListItem, SupplierInvoiceDPStatus } from "../types";

const SupplierInvoiceDPFormDialog = dynamic(
  () => import("./supplier-invoice-dp-form").then((m) => m.SupplierInvoiceDPFormDialog),
  { ssr: false },
);

function statusLabel(t: ReturnType<typeof useTranslations>, status: SupplierInvoiceDPStatus) {
  return t(`status.${status.toLowerCase()}`);
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export function SupplierInvoiceDPList() {
  const t = useTranslations("supplierInvoiceDP");

  const [search, setSearch] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listParams = useMemo(() => ({ page: 1, per_page: 10, search }), [search]);
  const { data, isLoading, isError } = useSupplierInvoiceDPs(listParams);

  const deleteMutation = useDeleteSupplierInvoiceDP();
  const pendingMutation = usePendingSupplierInvoiceDP();

  const canCreate = useUserPermission("supplier_invoice_dp.create");
  const canUpdate = useUserPermission("supplier_invoice_dp.update");
  const canDelete = useUserPermission("supplier_invoice_dp.delete");
  const canPending = useUserPermission("supplier_invoice_dp.pending");
  const canExport = useUserPermission("supplier_invoice_dp.export");

  async function handleExport() {
    try {
      const blob = await supplierInvoiceDPService.exportCsv(listParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "supplier-invoice-down-payments.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const response = await deleteMutation.mutateAsync(deleteId);
      if (!response.success) throw new Error(response.error ?? "delete_failed");
      toast.success(t("toast.deleted"));
      setDeleteOpen(false);
      setDeleteId(null);
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

  const rows = data?.success ? data.data : [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:w-[320px]"
          />
          <div className="flex gap-2">
            {canExport ? (
              <Button variant="outline" onClick={handleExport} className="cursor-pointer">
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
                {t("actions.create")}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? <Skeleton className="h-40 w-full" /> : null}
        {isError ? <div className="text-sm text-destructive">{t("toast.failed")}</div> : null}

        {!isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.invoiceNumber")}</TableHead>
                <TableHead>{t("columns.invoiceDate")}</TableHead>
                <TableHead>{t("columns.dueDate")}</TableHead>
                <TableHead>{t("columns.purchaseOrder")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <TableHead className="text-right">{t("actions.view")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.invoice_number}</TableCell>
                  <TableCell>{safeDate(row.invoice_date)}</TableCell>
                  <TableCell>{safeDate(row.due_date)}</TableCell>
                  <TableCell>{row.purchase_order?.code ?? "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>{statusLabel(t, row.status)}</TableCell>
                  <TableCell>{safeDate(row.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          setDetailId(row.id);
                          setDetailOpen(true);
                        }}
                      >
                        {t("actions.view")}
                      </Button>
                      {canUpdate ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            setEditId(row.id);
                            setFormOpen(true);
                          }}
                        >
                          {t("actions.edit")}
                        </Button>
                      ) : null}
                      {canPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => handlePending(row.id)}
                        >
                          {t("actions.pending")}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => {
                            setDeleteId(row.id);
                            setDeleteOpen(true);
                          }}
                        >
                          {t("actions.delete")}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>

      <SupplierInvoiceDPFormDialog open={formOpen} onOpenChange={setFormOpen} invoiceId={editId} />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("actions.view")}</DialogTitle>
          </DialogHeader>
          {detailId ? <SupplierInvoiceDPDetailWithFetch id={detailId} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("actions.delete")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Delete this down payment invoice?</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="cursor-pointer">
                {t("actions.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="cursor-pointer"
              >
                {t("actions.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SupplierInvoiceDPDetailWithFetch({ id }: { id: string }) {
  const t = useTranslations("supplierInvoiceDP");
  const { data, isLoading, isError } = useSupplierInvoiceDP(id, { enabled: !!id });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data?.success) return <div className="text-sm text-destructive">{t("toast.failed")}</div>;

  const row = data.data;

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{t("columns.code")}</div>
      <div className="font-medium">{row.code}</div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.purchaseOrder")}</div>
          <div className="font-medium">{row.purchase_order?.code ?? "-"}</div>
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
          <div className="font-medium">{statusLabel(t, row.status)}</div>
        </div>
      </div>

      {row.notes ? (
        <div>
          <div className="text-sm text-muted-foreground">{t("fields.notes")}</div>
          <div className="whitespace-pre-wrap">{row.notes}</div>
        </div>
      ) : null}
    </div>
  );
}
