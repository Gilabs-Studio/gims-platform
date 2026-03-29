"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useGoodsReceipt } from "@/features/purchase/goods-receipt/hooks/use-goods-receipts";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";
import type { PurchaseReturn } from "../types";
import { usePurchaseReturnAuditTrail } from "../hooks/use-purchase-returns";

interface PurchaseReturnDetailProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item?: PurchaseReturn | null;
}

export function PurchaseReturnDetail({ open, onOpenChange, item }: PurchaseReturnDetailProps) {
  const t = useTranslations("purchaseReturns");
  const tCommon = useTranslations("common");
  const data = item ?? null;
  const [activeTab, setActiveTab] = useState<"general" | "audit-trail">("general");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const { data: goodsReceiptResponse } = useGoodsReceipt(data?.goods_receipt_id ?? "", {
    enabled: open && !!data?.goods_receipt_id,
  });
  const goodsReceipt = goodsReceiptResponse?.data;

  const { data: auditData, isLoading: auditLoading, isError: auditError } = usePurchaseReturnAuditTrail(
    data?.id ?? "",
    { page: auditPage, per_page: auditPageSize },
    { enabled: open && !!data?.id && activeTab === "audit-trail" },
  );

  const auditEntries = auditData?.data ?? [];
  const auditPagination = auditData?.meta?.pagination;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setActiveTab("general");
          setAuditPage(1);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.return_number ?? t("detail.title")}</DialogTitle>
        </DialogHeader>

        {!data ? null : (
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value === "audit-trail" ? "audit-trail" : "general")
            }
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="audit-trail">{t("tabs.auditTrail")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="py-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("detail.status")}</TableCell>
                      <TableCell><Badge>{data.status}</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.goodsReceipt")}</TableCell>
                      <TableCell>{goodsReceipt?.code ?? "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.supplier")}</TableCell>
                      <TableCell>{goodsReceipt?.supplier?.name ?? "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.action")}</TableCell>
                      <TableCell>{data.action}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.amount")}</TableCell>
                      <TableCell>{formatCurrency(data.total_amount ?? 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.createdAt")}</TableCell>
                      <TableCell>{formatDate(data.created_at)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="audit-trail" className="py-4">
              <AuditTrailTable
                entries={auditEntries}
                isLoading={auditLoading && auditEntries.length === 0}
                errorText={auditError && auditEntries.length === 0 ? tCommon("error") : undefined}
                pagination={auditPagination}
                onPageChange={setAuditPage}
                onPageSizeChange={(nextSize) => {
                  setAuditPageSize(nextSize);
                  setAuditPage(1);
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
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
