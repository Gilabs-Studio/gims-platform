"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDeliveryOrder } from "@/features/sales/delivery/hooks/use-deliveries";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import type { SalesReturn } from "../types";

interface SalesReturnDetailProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item?: SalesReturn | null;
}

export function SalesReturnDetail({ open, onOpenChange, item }: SalesReturnDetailProps) {
  const t = useTranslations("salesReturns");
  const data = item ?? null;
  const { data: deliveryResponse } = useDeliveryOrder(data?.delivery_id ?? "", {
    enabled: open && !!data?.delivery_id,
  });
  const delivery = deliveryResponse?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.return_number ?? t("detail.title")}</DialogTitle>
        </DialogHeader>

        {!data ? null : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50 w-48">{t("detail.status")}</TableCell>
                  <TableCell><Badge>{data.status}</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.delivery")}</TableCell>
                  <TableCell>{delivery?.code ?? "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.salesOrder")}</TableCell>
                  <TableCell>{delivery?.sales_order?.code ?? "-"}</TableCell>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
