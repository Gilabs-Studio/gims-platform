"use client";

import { Warehouse, MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Warehouse as WarehouseType } from "../../types";

interface WarehouseCardProps {
  readonly warehouse: WarehouseType;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: (key: string) => string;
  readonly onDetail?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function WarehouseCard({
  warehouse,
  isSelected,
  onClick,
  t,
  onDetail,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: WarehouseCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Warehouse className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{warehouse.name}</h4>
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {warehouse.code}
            </Badge>
          </div>
          {warehouse.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {warehouse.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              className="text-xs" 
              variant={warehouse.is_active ? "success" : "secondary"}
            >
              {warehouse.is_active ? t("common.active") : t("common.inactive")}
            </Badge>
            {warehouse.capacity && (
              <span className="text-xs text-muted-foreground">
                Capacity: {warehouse.capacity}
              </span>
            )}
            {warehouse.latitude != null && warehouse.longitude != null && (
              <span className="text-xs text-muted-foreground">
                📍 {Number(warehouse.latitude).toFixed(4)},{" "}
                {Number(warehouse.longitude).toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1 border shadow-sm">
        {onDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail();
            }}
            className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}

        {canUpdate && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-full hover:bg-accent text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
            title="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}

        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-full hover:bg-accent text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
