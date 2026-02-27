import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface SupplierInvoiceDownPaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export function SupplierInvoiceDownPaymentStatusBadge({ status, className }: SupplierInvoiceDownPaymentStatusBadgeProps) {
  const t = useTranslations("supplierInvoiceDP.status");
  const normalizedStatus = (status ?? "").toLowerCase();

  switch (normalizedStatus) {
    case "paid":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("paid")}
        </Badge>
      );
    case "unpaid":
      return (
        <Badge variant="warning" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("unpaid")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="info" className={className}>
          <TrendingUp className="h-3 w-3 mr-1.5" />
          {t("partial")}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className={className}>
          <FileText className="h-3 w-3 mr-1.5" />
          {t("draft")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
