"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";

import { useSalesPaymentAuditTrail } from "../hooks/use-sales-payments";

interface SalesPaymentAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly paymentId?: string | null;
}

export function SalesPaymentAuditTrail({ open, onClose, paymentId }: SalesPaymentAuditTrailProps) {
  const t = useTranslations("salesPayment");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useSalesPaymentAuditTrail(
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
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
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
