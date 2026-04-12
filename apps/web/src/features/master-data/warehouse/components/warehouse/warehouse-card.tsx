"use client";

import { Warehouse, MapPin, Eye, Edit, Trash2, Store } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  readonly onStatusChange?: (isActive: boolean) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
  readonly isStatusChanging?: boolean;
}

export function WarehouseCard({
  warehouse,
  isSelected,
  onClick,
  t,
  onDetail,
  onEdit,
  onDelete,
  onStatusChange,
  canUpdate,
  canDelete,
  isStatusChanging,
}: WarehouseCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary",
        !warehouse.is_active && "bg-muted/30 opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-full p-2 shrink-0",
            !warehouse.is_active
              ? "bg-muted/50"
              : warehouse.outlet_id
                ? "bg-warning/10"
                : "bg-primary/10"
          )}
        >
          {warehouse.outlet_id ? (
            <Store className={cn("h-4 w-4", warehouse.is_active ? "text-warning" : "text-muted-foreground")} />
          ) : (
            <Warehouse className={cn("h-4 w-4", warehouse.is_active ? "text-primary" : "text-muted-foreground")} />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className={cn("font-medium text-sm truncate", !warehouse.is_active && "line-through text-muted-foreground")}>
              {warehouse.name}
            </h4>
            {!warehouse.is_active && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                {t("common.inactive")}
              </span>
            )}
          </div>
          {warehouse.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {warehouse.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {warehouse.capacity && (
              <span className="text-xs text-muted-foreground">
                Capacity: {warehouse.capacity}
              </span>
            )}
              {warehouse.outlet_id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Outlet
                </span>
              )}
          </div>
          {canUpdate && onStatusChange && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <Switch
                checked={warehouse.is_active}
                onCheckedChange={onStatusChange}
                disabled={isStatusChanging}
                className="cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">
                {warehouse.is_active ? t("common.active") : t("common.inactive")}
              </span>
            </div>
          )}
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
            className="p-1.5 rounded-full hover:bg-accent text-warning hover:text-warning transition-colors cursor-pointer"
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
            className="p-1.5 rounded-full hover:bg-accent text-destructive hover:text-destructive transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
