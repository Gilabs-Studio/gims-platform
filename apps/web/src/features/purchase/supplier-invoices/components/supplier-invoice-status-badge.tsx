import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Send, XCircle, CreditCard, PieChart } from "lucide-react";
import { useTranslations } from "next-intl";

interface SupplierInvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function SupplierInvoiceStatusBadge({ status, className }: SupplierInvoiceStatusBadgeProps) {
  const t = useTranslations("supplierInvoice.status");
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
          <CreditCard className="h-3 w-3 mr-1.5" />
          {t("unpaid")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="warning" className={className}>
          <PieChart className="h-3 w-3 mr-1.5" />
          {t("partial")}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("draft")}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className={className}>
          <Send className="h-3 w-3 mr-1.5" />
          {t("submitted")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("approved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("rejected")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("cancelled")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
