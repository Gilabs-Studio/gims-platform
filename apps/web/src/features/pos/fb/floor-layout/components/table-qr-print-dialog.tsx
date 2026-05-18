"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw } from "lucide-react";
import { useGenerateTableQR } from "../hooks/use-table-qr";
import type { TableQRToken } from "../types/table-qr";

interface TableQRPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorPlanId: string;
  tableObjectId: string;
  tableLabel: string;
  outletName: string;
  /** Existing active token, if any */
  token: TableQRToken | null;
}

export function TableQRPrintDialog({
  open,
  onOpenChange,
  floorPlanId,
  tableObjectId,
  tableLabel,
  outletName,
  token,
}: TableQRPrintDialogProps) {
  const t = useTranslations("floorLayout.tableQr");
  const printRef = useRef<HTMLDivElement>(null);

  const generate = useGenerateTableQR(floorPlanId);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    const printTitle = t("printPageTitle", { table: tableLabel });
    win.document.write(`
      <html>
        <head>
          <title>${printTitle}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
            .card { text-align: center; padding: 32px; border: 2px solid #000; border-radius: 12px; width: 280px; }
            .outlet { font-size: 13px; color: #666; margin-bottom: 4px; }
            .table-name { font-size: 22px; font-weight: bold; margin-bottom: 16px; }
            .qr-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
            .hint { font-size: 12px; color: #444; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  async function handleRotate() {
    await generate.mutateAsync({
      objectId: tableObjectId,
      data: { table_label: tableLabel },
    });
  }

  async function handleGenerate() {
    await generate.mutateAsync({
      objectId: tableObjectId,
      data: { table_label: tableLabel },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { table: tableLabel })}</DialogTitle>
        </DialogHeader>

        {token?.qr_base64 ? (
          <>
            <div
              ref={printRef}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="card text-center rounded-xl border-2 border-gray-900 p-6 w-64">
                <p className="outlet text-xs text-gray-500 mb-1">{outletName}</p>
                <p className="table-name text-lg font-bold mb-4">{tableLabel}</p>
                <div className="qr-wrap flex justify-center mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={token.qr_base64}
                    alt={t("imageAlt", { table: tableLabel })}
                    width={180}
                    height={180}
                  />
                </div>
                <p className="hint text-xs text-gray-500">
                  {t("scanHint")}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                disabled={generate.isPending}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                {t("rotateToken")}
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="mr-1.5 h-4 w-4" />
                {t("printQr")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground text-center">
              {t("noQrHint")}
            </p>
            <Button onClick={handleGenerate} disabled={generate.isPending}>
              {t("generateQr")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

