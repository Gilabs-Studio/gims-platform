import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { StockOpnameStatus } from "../types";
import { FileText, Clock, CheckCircle2, XCircle, Archive, Ban } from "lucide-react";

interface Props {
  status: StockOpnameStatus;
}

export function StockOpnameStatusBadge({ status }: Props) {
  const t = useTranslations("stock_opname.status");

  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
          <FileText className="h-3 w-3 mr-1" />
          {t("draft")}
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
          <Clock className="h-3 w-3 mr-1" />
          {t("pending")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("approved")}
        </Badge>
      );
    case "posted":
      return (
        <Badge className="bg-primary hover:bg-primary/90">
          <Archive className="h-3 w-3 mr-1" />
          {t("posted")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          {t("rejected")}
        </Badge>
      );
    default:
        // Fallback for unexpected statuses
        if (status === 'canceled' as any) {
             return (
                <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
                    <Ban className="h-3 w-3 mr-1" />
                    {t("canceled")}
                </Badge>
            );
        }
      return <Badge variant="outline">{status}</Badge>;
  }
}
