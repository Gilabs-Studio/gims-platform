"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { POSOrder } from "../types";

interface POSReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  order: POSOrder;
  customerName?: string;
  /** Tender amount entered by cashier (cash payments) */
  tenderAmount?: number;
}

export function POSReceiptDialog({
  open,
  onClose,
  order,
  customerName,
  tenderAmount,
}: POSReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const change = tenderAmount != null ? tenderAmount - order.total_amount : undefined;

  function handlePrint() {
    const el = receiptRef.current;
    if (!el) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .row { display: flex; justify-content: space-between; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .total { font-size: 14px; font-weight: bold; }
    .item-name { flex: 1; }
    .item-qty { width: 30px; text-align: right; margin-right: 4px; }
    .item-price { width: 70px; text-align: right; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
${el.innerHTML}
<script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  const orderDate = new Date(order.created_at).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div
          ref={receiptRef}
          className="font-mono text-xs bg-card text-card-foreground border rounded-md p-4 space-y-1 max-h-[60vh] overflow-y-auto"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          {/* Header */}
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">NOTA PEMBAYARAN</p>
            <p className="text-muted-foreground">{orderDate}</p>
          </div>

          <div className="border-t border-dashed border-border my-2" />

          {/* Order info */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">No. Order</span>
            <span className="font-medium">{order.order_number}</span>
          </div>
          {order.table_label && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meja</span>
              <span className="font-medium">{order.table_label}</span>
            </div>
          )}
          {customerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{customerName}</span>
            </div>
          )}

          <div className="border-t border-dashed border-border my-2" />

          {/* Items */}
          <div className="space-y-1">
            {(order.items ?? []).map((item) => (
              <div key={item.id}>
                <span className="font-medium">{item.product_name}</span>
                <div className="flex justify-between">
                  <span className="pl-2 text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border my-2" />

          {/* Totals */}
          {order.discount_amount > 0 && (
            <div className="flex justify-between">
              <span>Diskon</span>
              <span>-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>Pajak</span>
              <span>{formatCurrency(order.tax_amount)}</span>
            </div>
          )}
          {order.service_charge > 0 && (
            <div className="flex justify-between">
              <span>Service</span>
              <span>{formatCurrency(order.service_charge)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>
          {tenderAmount != null && (
            <>
              <div className="flex justify-between">
                <span>Bayar</span>
                <span>{formatCurrency(tenderAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Kembali</span>
                <span>{formatCurrency(change ?? 0)}</span>
              </div>
            </>
          )}

          <div className="border-t border-dashed border-border my-2" />

          <p className="text-center text-muted-foreground text-[10px]">
            Terima kasih atas kunjungan Anda!
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
          <Button className="flex-1 cursor-pointer" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
