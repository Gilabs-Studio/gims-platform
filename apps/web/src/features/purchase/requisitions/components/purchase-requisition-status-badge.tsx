import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, History, XCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface PurchaseRequisitionStatusBadgeProps {
  status: string;
  className?: string;
}

export function PurchaseRequisitionStatusBadge({ status, className }: PurchaseRequisitionStatusBadgeProps) {
  const t = useTranslations("purchaseRequisition.status");
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
          <FileText className="h-3 w-3 mr-1.5" />
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
    case "converted":
      return (
        <Badge variant="outline" className={className}>
          <History className="h-3 w-3 mr-1.5" />
          {t("converted")}
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
