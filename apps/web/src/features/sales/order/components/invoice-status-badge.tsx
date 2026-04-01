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
            {t("status.sent")}
        </Badge>
      );
      case "submitted":
        return (
          <Badge variant="info" className={className}>
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.sent")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="info" className={className}>
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.pending")}
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
      // Try to resolve a localized label first, fallback to raw status
      const label = t(`status.${normalizedStatus}`) || status;
      return <Badge variant="outline" className={className}>{label}</Badge>;
  }
}
