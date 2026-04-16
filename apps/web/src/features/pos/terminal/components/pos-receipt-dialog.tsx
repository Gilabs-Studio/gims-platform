"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { posOrderService } from "../services/pos-service";
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
}: POSReceiptDialogProps) {
  const receiptUrl = useMemo(() => posOrderService.getReceiptUrl(order.id), [
    order.id,
  ]);

  const [receiptHtml, setReceiptHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadReceiptHtml() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const res = await fetch(receiptUrl, {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "text/html",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load receipt (${res.status})`);
        }

        const html = await res.text();
        if (!cancelled) {
          setReceiptHtml(html);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Gagal memuat receipt dari server.");
          setReceiptHtml("");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadReceiptHtml();

    return () => {
      cancelled = true;
    };
  }, [open, receiptUrl]);

  function handlePrint() {
    if (!receiptHtml) return;

    const printWindow = window.open("", "_blank", "width=420,height=760");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-card overflow-hidden">
          {isLoading && (
            <div className="h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
              Memuat receipt...
            </div>
          )}
          {!isLoading && loadError && (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3 p-4 text-center text-sm">
              <p className="text-destructive">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => window.open(receiptUrl, "_blank", "width=420,height=760")}
              >
                Buka Receipt di Tab Baru
              </Button>
            </div>
          )}
          {!isLoading && !loadError && !!receiptHtml && (
            <iframe
              srcDoc={receiptHtml}
              title={`Receipt ${order.order_number}`}
              className="w-full h-[60vh] bg-white"
            />
          )}
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
          <Button
            className="flex-1 cursor-pointer"
            onClick={handlePrint}
            disabled={!receiptHtml || !!loadError}
          >
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
