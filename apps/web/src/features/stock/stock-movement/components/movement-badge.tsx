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
        <Badge className="bg-green-600 hover:bg-green-700">
          <ArrowDownLeft className="h-3 w-3 mr-1" />
          IN
        </Badge>
      );
    case "OUT":
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          OUT
        </Badge>
      );
    case "ADJUST":
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">
          <RefreshCw className="h-3 w-3 mr-1" />
          ADJUST
        </Badge>
      );
    case "TRANSFER":
      return (
        <Badge variant="outline">
          <Repeat className="h-3 w-3 mr-1" />
          TRANSFER
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}
