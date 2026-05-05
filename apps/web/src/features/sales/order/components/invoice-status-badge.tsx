import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CreditCard, PieChart, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const t = useTranslations("invoice");
  const rawStatus = (status ?? "").toLowerCase();
  const normalizedStatus = rawStatus === "approved" ? "unpaid" : rawStatus;
  const fallbackLabel = rawStatus ? rawStatus.replace(/_/g, " ") : "-";

  switch (normalizedStatus) {
    case "draft":
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("status.draft")}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className={className}>
          <Send className="h-3 w-3 mr-1.5" />
          {t("status.submitted")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("status.rejected")}
        </Badge>
      );
    case "unpaid":
      return (
        <Badge variant="warning" className={className}>
          <CreditCard className="h-3 w-3 mr-1.5" />
          {t("status.unpaid")}
        </Badge>
      );
    case "waiting_approval":
      return (
        <Badge variant="info" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("status.waiting_approval")}
        </Badge>
      );
    case "waiting_payment":
      return (
        <Badge variant="info" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("status.waiting_payment")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="warning" className={className}>
          <PieChart className="h-3 w-3 mr-1.5" />
          {t("status.partial")}
        </Badge>
      );
    case "paid":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("status.paid")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("status.cancelled")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{fallbackLabel}</Badge>;
  }
}
