"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPermission } from "@/hooks/use-user-permission";
import { SupplierInvoiceStatusBadge } from "@/features/purchase/supplier-invoices/components/supplier-invoice-status-badge";
import { SupplierInvoiceDetail } from "@/features/purchase/supplier-invoices/components/supplier-invoice-detail";
import type { PurchaseOrderSISummary } from "../types";

interface SILinkedDialogProps {
  purchaseOrderCode: string;
  items: PurchaseOrderSISummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SILinkedDialog({
  purchaseOrderCode,
  items,
  open,
  onOpenChange,
}: SILinkedDialogProps) {
  const t = useTranslations("supplierInvoice");
  const canViewSI = useUserPermission("supplier_invoice.read");
  const [selectedSIId, setSelectedSIId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              {t("title")} — {purchaseOrderCode}
            </DialogTitle>
          </DialogHeader>

          {!canViewSI ? (
            <div className="p-6 text-center">
              <p className="text-warning font-medium">
                You don&apos;t have permission to view supplier invoices.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.code")}</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                        {t("notFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((si) => (
                      <TableRow key={si.id} className="hover:bg-muted/50">
                        <TableCell>
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedSIId(si.id);
                              setDetailOpen(true);
                            }}
                          >
                            {si.code}
                          </button>
                        </TableCell>
                        <TableCell>
                          <SupplierInvoiceStatusBadge status={si.status} className="text-xs" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SupplierInvoiceDetail
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedSIId(null);
        }}
        invoiceId={selectedSIId}
      />
    </>
  );
}

