"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { usePurchaseRequisitionAuditTrail } from "../hooks/use-purchase-requisitions";

interface PurchaseRequisitionAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly requisitionId?: string | null;
}

interface PurchaseRequisitionAuditTrailContentProps {
  readonly enabled: boolean;
  readonly requisitionId?: string | null;
}

export function PurchaseRequisitionAuditTrailContent({
  enabled,
  requisitionId,
}: PurchaseRequisitionAuditTrailContentProps) {
  const t = useTranslations("purchaseRequisition");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = usePurchaseRequisitionAuditTrail(
    requisitionId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!requisitionId },
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

export function PurchaseRequisitionAuditTrail({
  open,
  onClose,
  requisitionId,
}: PurchaseRequisitionAuditTrailProps) {
  const t = useTranslations("purchaseRequisition");
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>
        <PurchaseRequisitionAuditTrailContent enabled={open} requisitionId={requisitionId} />
      </DialogContent>
    </Dialog>
  );
}
