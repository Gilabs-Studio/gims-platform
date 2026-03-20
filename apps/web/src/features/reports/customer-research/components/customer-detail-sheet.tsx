"use client";

import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCustomerDetail } from "../hooks/use-customer-detail";

interface CustomerDetailSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly customerId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export function CustomerDetailSheet({
  open,
  onOpenChange,
  customerId,
  startDate,
  endDate,
}: CustomerDetailSheetProps) {
  const t = useTranslations("customerResearchReport.detail");
  const { detail, isLoading } = useCustomerDetail(
    customerId ?? "",
    startDate,
    endDate,
    open && Boolean(customerId)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{detail?.customer_name ?? t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          ) : detail ? (
            <>
              <Metric label={t("total_revenue")} value={formatCurrency(detail.total_revenue)} />
              <Metric label={t("total_orders")} value={detail.total_orders.toLocaleString("id-ID")} />
              <Metric label={t("average_order_value")} value={formatCurrency(detail.average_order_value)} />
              <Metric
                label={t("last_order_date")}
                value={detail.last_order_date ? formatDate(detail.last_order_date, "id-ID") : "-"}
              />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">{t("not_found")}</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
