"use client";

import { CashBankJournalDetailDialog } from "@/features/finance/cash-bank/components/cash-bank-journal-detail-dialog";
import { ClosingDetail } from "@/features/finance/closing/components/closing-detail";
import { SupplierInvoiceDPDetailModal } from "@/features/purchase/supplier-invoice-down-payments/components/supplier-invoice-dp-detail-modal";
import { SupplierInvoiceDetail } from "@/features/purchase/supplier-invoices/components/supplier-invoice-detail";
import { PurchaseOrderDetail } from "@/features/purchase/orders/components/purchase-order-detail";
import { PurchasePaymentDetail } from "@/features/purchase/payments/components/purchase-payment-detail";
import { GoodsReceiptDetail } from "@/features/purchase/goods-receipt/components/goods-receipt-detail";
import { CustomerInvoiceDPDetailModal } from "@/features/sales/customer-invoice-down-payments/components/customer-invoice-dp-detail-modal";
import { DeliveryDetailModal } from "@/features/sales/delivery/components/delivery-detail-modal";
import { InvoiceDetailModal } from "@/features/sales/invoice/components/invoice-detail-modal";
import type { CustomerInvoice } from "@/features/sales/invoice/types";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import type { SalesOrder } from "@/features/sales/order/types";
import type { DeliveryOrder } from "@/features/sales/delivery/types";
import { SalesPaymentDetail } from "@/features/sales/payments/components/sales-payment-detail";
import {
  canResolveSource,
  resolveSourceKind,
  type SourceKind,
} from "@/features/finance/shared/reference-source-matrix";

import type { UnifiedJournalRow } from "./journal-table";
import { JournalDetailModal } from "./journal-detail-modal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: UnifiedJournalRow | null;
};

export function canResolveJournalSourceDetail(referenceType?: string | null): boolean {
  return canResolveSource(referenceType);
}

export function JournalSourceDetailModal({ open, onOpenChange, row }: Props) {
  const referenceId = row?.referenceId ?? null;
  const journalId = row?.id ?? null;
  const sourceKind = resolveSourceKind(row?.referenceType) as SourceKind;
  const fallbackDate = row?.entryDate ?? new Date().toISOString();
  const fallbackTimestamp = row?.createdAt ?? row?.updatedAt ?? fallbackDate;

  const salesInvoiceStub: CustomerInvoice | null = referenceId
    ? {
        id: referenceId,
        code: row?.referenceCode ?? "",
        type: "regular",
        invoice_date: fallbackDate,
        tax_rate: 0,
        tax_amount: 0,
        delivery_cost: 0,
        other_cost: 0,
        subtotal: 0,
        amount: 0,
        status: "draft",
        created_at: fallbackTimestamp,
        updated_at: fallbackTimestamp,
      }
    : null;

  const salesOrderStub: SalesOrder | null = referenceId
    ? ({ id: referenceId } as unknown as SalesOrder)
    : null;

  const deliveryOrderStub: DeliveryOrder | null = referenceId
    ? ({ id: referenceId } as unknown as DeliveryOrder)
    : null;

  if (!open) {
    return null;
  }

  switch (sourceKind) {
    case "sales-payment":
      if (!referenceId) return null;
      return (
        <SalesPaymentDetail
          open={open}
          onClose={() => onOpenChange(false)}
          paymentId={referenceId}
        />
      );
    case "sales-order":
      if (!salesOrderStub) return null;
      return (
        <OrderDetailModal
          open={open}
          onClose={() => onOpenChange(false)}
          order={salesOrderStub}
        />
      );
    case "delivery-order":
      if (!deliveryOrderStub) return null;
      return (
        <DeliveryDetailModal
          open={open}
          onClose={() => onOpenChange(false)}
          delivery={deliveryOrderStub}
        />
      );
    case "purchase-payment":
      if (!referenceId) return null;
      return (
        <PurchasePaymentDetail
          open={open}
          onClose={() => onOpenChange(false)}
          paymentId={referenceId}
        />
      );
    case "purchase-order":
      if (!referenceId) return null;
      return (
        <PurchaseOrderDetail
          open={open}
          onClose={() => onOpenChange(false)}
          purchaseOrderId={referenceId}
        />
      );
    case "sales-invoice":
      if (!salesInvoiceStub) return null;
      return (
        <InvoiceDetailModal
          open={open}
          onClose={() => onOpenChange(false)}
          invoice={salesInvoiceStub}
        />
      );
    case "sales-invoice-dp":
      if (!referenceId) return null;
      return (
        <CustomerInvoiceDPDetailModal
          open={open}
          onOpenChange={onOpenChange}
          id={referenceId}
        />
      );
    case "purchase-invoice":
      if (!referenceId) return null;
      return (
        <SupplierInvoiceDetail
          open={open}
          onClose={() => onOpenChange(false)}
          invoiceId={referenceId}
        />
      );
    case "purchase-invoice-dp":
      if (!referenceId) return null;
      return (
        <SupplierInvoiceDPDetailModal
          open={open}
          onOpenChange={onOpenChange}
          id={referenceId}
        />
      );
    case "goods-receipt":
      if (!referenceId) return null;
      return (
        <GoodsReceiptDetail
          open={open}
          onClose={() => onOpenChange(false)}
          goodsReceiptId={referenceId}
        />
      );
    case "closing":
      if (!referenceId) return null;
      return (
        <ClosingDetail
          open={open}
          onOpenChange={onOpenChange}
          closingId={referenceId}
        />
      );
    case "finance-journal":
    case "finance-payment":
      if (!journalId) return null;
      return (
        <JournalDetailModal
          open={open}
          onOpenChange={onOpenChange}
          id={journalId}
        />
      );
    case "cash-bank":
      if (!referenceId) return null;
      return (
        <CashBankJournalDetailDialog
          open={open}
          onOpenChange={onOpenChange}
          id={referenceId}
        />
      );
    default:
      return null;
  }
}