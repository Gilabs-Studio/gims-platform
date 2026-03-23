"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useSupplierInvoiceAuditTrail } from "../hooks/use-supplier-invoices";

interface SupplierInvoiceAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoiceId?: string | null;
}

export function SupplierInvoiceAuditTrail({ open, onClose, invoiceId }: SupplierInvoiceAuditTrailProps) {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useSupplierInvoiceAuditTrail(
    invoiceId ?? "",
    { page, per_page: pageSize },
    { enabled: open && !!invoiceId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>
        <AuditTrailTable
          entries={items}
          isLoading={isLoading && items.length === 0}
          errorText={isError && items.length === 0 ? tCommon("error") : undefined}
          pagination={pagination}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          labels={{
            empty: t("auditTrail.empty"),
            columns: {
              action: t("auditTrail.columns.action"),
              user: t("auditTrail.columns.user"),
              time: t("auditTrail.columns.time"),
              details: t("auditTrail.columns.details"),
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
