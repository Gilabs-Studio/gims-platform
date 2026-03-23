"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { usePurchaseOrderAuditTrail } from "../hooks/use-purchase-orders";

interface PurchaseOrderAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly purchaseOrderId?: string | null;
}

interface PurchaseOrderAuditTrailContentProps {
  readonly purchaseOrderId?: string | null;
  readonly enabled?: boolean;
}

export function PurchaseOrderAuditTrailContent({
  purchaseOrderId,
  enabled = true,
}: PurchaseOrderAuditTrailContentProps) {
  const t = useTranslations("purchaseOrder");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = usePurchaseOrderAuditTrail(
    purchaseOrderId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!purchaseOrderId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <AuditTrailTable
      entries={items}
      isLoading={isLoading && items.length === 0}
      errorText={isError && items.length === 0 ? tCommon("error") : undefined}
      pagination={pagination}
      onPageChange={(p) => setPage(p)}
      onPageSizeChange={(ps) => {
        setPageSize(ps);
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
  );
}

export function PurchaseOrderAuditTrail({
  open,
  onClose,
  purchaseOrderId,
}: PurchaseOrderAuditTrailProps) {
  const t = useTranslations("purchaseOrder");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>
        <PurchaseOrderAuditTrailContent enabled={open} purchaseOrderId={purchaseOrderId} />
      </DialogContent>
    </Dialog>
  );
}
