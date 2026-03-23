import { Badge } from "@/components/ui/badge";
import { StockMovementType } from "../types";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, RefreshCw } from "lucide-react";

interface MovementBadgeProps {
  type: StockMovementType;
  refType?: string;
}

export function MovementBadge({ type, refType }: MovementBadgeProps) {
  const isTransfer = type === "TRANSFER" || refType?.toUpperCase() === "TRANSFER";

  if (isTransfer) {
    return (
      <Badge variant="warning">
        <ArrowRightLeft className="h-3 w-3 mr-1" />
        TRANSFER
      </Badge>
    );
  }

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
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}
