import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, Truck, PieChart, Clock, XCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const t = useTranslations("order.status");

  switch (status) {
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
          {t("pending")}
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
        <Badge variant="secondary" className="bg-mutedslate hover:bg-mutedslate text-white border-transparent">
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("closed")}
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
