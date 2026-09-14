import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface GoodsReceiptStatusBadgeProps {
  status: string;
  className?: string;
  onClick?: () => void;
}

export function GoodsReceiptStatusBadge({ status, className, onClick }: GoodsReceiptStatusBadgeProps) {
  const t = useTranslations("goodsReceipt.status");
  const normalizedStatus = (status ?? "").toLowerCase();
  const interactiveClass = onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : "";

  switch (normalizedStatus) {
    case "draft":
      return (
        <Badge variant="secondary" className={`${className || ""} ${interactiveClass}`.trim()} onClick={onClick}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("draft")}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className={`${className || ""} ${interactiveClass}`.trim()} onClick={onClick}>
          <Send className="h-3 w-3 mr-1.5" />
          {t("submitted")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success" className={`${className || ""} ${interactiveClass}`.trim()} onClick={onClick}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("approved")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="warning" className={`${className || ""} ${interactiveClass}`.trim()} onClick={onClick}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("partial")}
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="secondary" className={`bg-mutedslate hover:bg-mutedslate text-white border-transparent ${className ?? ""} ${interactiveClass}`.trim()} onClick={onClick}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("closed")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className={`${className || ""} ${interactiveClass}`.trim()} onClick={onClick}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("rejected")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}

