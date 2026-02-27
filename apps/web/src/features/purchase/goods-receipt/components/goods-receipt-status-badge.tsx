import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface GoodsReceiptStatusBadgeProps {
  status: string;
  className?: string;
}

export function GoodsReceiptStatusBadge({ status, className }: GoodsReceiptStatusBadgeProps) {
  const t = useTranslations("goodsReceipt.status");
  const normalizedStatus = (status ?? "").toLowerCase();

  switch (normalizedStatus) {
    case "draft":
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("draft")}
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("confirmed")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
