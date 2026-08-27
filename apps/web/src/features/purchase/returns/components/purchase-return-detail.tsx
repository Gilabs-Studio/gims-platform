"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useGoodsReceipt } from "@/features/purchase/goods-receipt/hooks/use-goods-receipts";
import { GoodsReceiptDetail } from "@/features/purchase/goods-receipt/components/goods-receipt-detail";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";
import { useUserPermission } from "@/hooks/use-user-permission";
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
  const [activeTab, setActiveTab] = useState<"general" | "items" | "audit-trail">("general");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [isGoodsReceiptOpen, setIsGoodsReceiptOpen] = useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);

  const canViewGR = useUserPermission("goods_receipt.read");
  const canViewSupplier = useUserPermission("supplier.read");

  const { data: goodsReceiptResponse } = useGoodsReceipt(data?.goods_receipt_id ?? "", {
    enabled: open && !!data?.goods_receipt_id,
  });
  const goodsReceipt = goodsReceiptResponse?.data;

  const productMap = useMemo(() => {
    const map = new Map<string, { code?: string; name?: string; sku?: string }>();
    (goodsReceipt?.items ?? []).forEach((gri) => {
      if (gri.product?.id) {
        map.set(gri.product.id, {
          code: gri.product.sku ?? undefined,
          name: gri.product.name,
        });
      }
    });
    return map;
  }, [goodsReceipt?.items]);

  const { data: auditData, isLoading: auditLoading, isError: auditError } = usePurchaseReturnAuditTrail(
    data?.id ?? "",
    { page: auditPage, per_page: auditPageSize },
    { enabled: open && !!data?.id && activeTab === "audit-trail" },
  );

  const auditEntries = auditData?.data ?? [];
  const auditPagination = auditData?.meta?.pagination;

  const supplierName = goodsReceipt?.supplier?.name ?? (data?.supplier_id ? `Supplier (${data.supplier_id.substring(0, 8)})` : "-");
  const warehouseName = (goodsReceipt as { warehouse?: { name?: string } } | undefined)?.warehouse?.name ?? (data?.warehouse_id ? `Warehouse (${data.warehouse_id.substring(0, 8)})` : "-");
  const poCode = goodsReceipt?.purchase_order?.code ?? data?.purchase_order_id ?? "-";

  return (
    <>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{data?.return_number ?? t("detail.title")}</DialogTitle>
          </DialogHeader>

          {!data ? null : (
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value === "audit-trail" ? "audit-trail" : value === "items" ? "items" : "general")
              }
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">Items ({data.items?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="audit-trail">{t("tabs.auditTrail")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="py-4 space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("detail.status")}</TableCell>
                        <TableCell><Badge>{data.status}</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.goodsReceipt")}</TableCell>
                        <TableCell>
                          {goodsReceipt?.code ? (
                            canViewGR ? (
                              <button
                                onClick={() => setIsGoodsReceiptOpen(true)}
                                className="font-medium text-primary hover:underline cursor-pointer text-left"
                              >
                                {goodsReceipt.code}
                              </button>
                            ) : (
                              <span>{goodsReceipt.code}</span>
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Purchase Order</TableCell>
                        <TableCell>{poCode}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.supplier")}</TableCell>
                        <TableCell>
                          {goodsReceipt?.supplier ? (
                            canViewSupplier ? (
                              <button
                                onClick={() => setIsSupplierOpen(true)}
                                className="text-primary hover:underline cursor-pointer text-left"
                              >
                                {supplierName}
                              </button>
                            ) : (
                              <span>{supplierName}</span>
                            )
                          ) : (
                            <span>{supplierName}</span>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Warehouse</TableCell>
                        <TableCell>{warehouseName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.action")}</TableCell>
                        <TableCell>{data.action}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Reason</TableCell>
                        <TableCell>{data.reason}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.amount")}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(data.total_amount ?? 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.createdAt")}</TableCell>
                        <TableCell>{formatDate(data.created_at)}</TableCell>
                      </TableRow>
                      {data.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Notes</TableCell>
                          <TableCell className="whitespace-pre-wrap">{data.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="items" className="py-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!data.items || data.items.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No return items available
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.items.map((item, idx) => {
                          const prod = productMap.get(item.product_id);
                          const prodLabel = prod
                            ? `${prod.code ? prod.code + " - " : ""}${prod.name ?? item.product_id}`
                            : (item.product_id ? `Product (${item.product_id.substring(0, 8)})` : "-");

                          return (
                            <TableRow key={item.id || idx}>
                              <TableCell className="font-medium">{prodLabel}</TableCell>
                              <TableCell><Badge variant="outline">{item.condition}</Badge></TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
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

      <GoodsReceiptDetail
        open={isGoodsReceiptOpen}
        onClose={() => setIsGoodsReceiptOpen(false)}
        goodsReceiptId={data?.goods_receipt_id}
      />

      <SupplierDetailModal
        open={isSupplierOpen}
        onOpenChange={setIsSupplierOpen}
        supplierId={goodsReceipt?.supplier?.id ?? null}
      />
    </>
  );
}
