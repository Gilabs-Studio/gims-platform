import { Badge } from "@/components/ui/badge";
import { StockMovementType } from "../types";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";

interface MovementBadgeProps {
  type: StockMovementType;
}

export function MovementBadge({ type }: MovementBadgeProps) {
  const t = useTranslations("common.movementType"); // map types in en.json later, or hardcode for now if strict

  switch (type) {
    case "IN":
      return (
        <Badge variant="success">
          <ArrowDownLeft className="h-3 w-3 mr-1" />
          IN
        </Badge>
      );
    case "OUT":
      return (
        <Badge variant="info">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          OUT
        </Badge>
      );
    case "ADJUST":
      return (
        <Badge variant="warning">
          <RefreshCw className="h-3 w-3 mr-1" />
          ADJUST
        </Badge>
      );
    case "TRANSFER":
      return (
        <Badge variant="default">
          <Repeat className="h-3 w-3 mr-1" />
          TRANSFER
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}
