"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { usePurchasePaymentAuditTrail } from "../hooks/use-purchase-payments";

interface PurchasePaymentAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly paymentId?: string | null;
}

export function PurchasePaymentAuditTrail({ open, onClose, paymentId }: PurchasePaymentAuditTrailProps) {
  const t = useTranslations("purchasePayment");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, paymentId]);

  const { data, isLoading, isError } = usePurchasePaymentAuditTrail(
    paymentId ?? "",
    { page, per_page: pageSize },
    { enabled: open && !!paymentId },
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
          onPageChange={setPage}
          onPageSizeChange={(v) => {
            setPageSize(v);
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
