import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface PurchaseOrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function PurchaseOrderStatusBadge({ status, className }: PurchaseOrderStatusBadgeProps) {
  const t = useTranslations("purchaseOrder.status");
  const normalizedStatus = (status ?? "").toLowerCase();

  switch (normalizedStatus) {
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
    case "rejected":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("rejected")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("approved")}
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="outline" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("closed")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
