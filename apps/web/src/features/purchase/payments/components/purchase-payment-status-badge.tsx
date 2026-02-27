import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface PurchasePaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export function PurchasePaymentStatusBadge({ status, className }: PurchasePaymentStatusBadgeProps) {
  const t = useTranslations("purchasePayment.status");
  const normalizedStatus = (status ?? "").toUpperCase();

  switch (normalizedStatus) {
    case "CONFIRMED":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("confirmed")}
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="warning" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("pending")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
