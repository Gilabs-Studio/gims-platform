import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, PieChart, Send, Truck, XCircle, Box } from "lucide-react";
import { useTranslations } from "next-intl";

interface DOStatusBadgeProps {
  status: string;
  className?: string;
}

export function DOStatusBadge({ status, className }: DOStatusBadgeProps) {
  const t = useTranslations("delivery.status");

  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("draft")}
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="info" className={className}>
          <Send className="h-3 w-3 mr-1.5" />
          {t("sent")}
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
    case "prepared":
      return (
        <Badge variant="warning" className={className}>
          <Box className="h-3 w-3 mr-1.5" />
          {t("prepared")}
        </Badge>
      );
    case "shipped":
      return (
        <Badge variant="default" className={className}>
          <Truck className="h-3 w-3 mr-1.5" />
          {t("shipped")}
        </Badge>
      );
    case "delivered":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("delivered")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="warning" className={className}>
          <PieChart className="h-3 w-3 mr-1.5" />
          {t("partial")}
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
