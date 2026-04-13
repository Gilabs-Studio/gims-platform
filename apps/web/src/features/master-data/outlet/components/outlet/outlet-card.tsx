"use client";

import { Store, MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Outlet } from "../../types";

interface OutletCardProps {
  readonly outlet: Outlet;
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

export function OutletCard({
  outlet,
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
}: OutletCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary",
        !outlet.is_active && "bg-muted/30 opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-full p-2 shrink-0",
            outlet.is_active ? "bg-primary/10" : "bg-muted/50"
          )}
        >
          <Store className={cn("h-4 w-4", outlet.is_active ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <h4 className={cn("font-medium text-sm truncate", !outlet.is_active && "line-through text-muted-foreground")}>
              {outlet.name}
            </h4>
            {!outlet.is_active && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {t("common.inactive")}
              </Badge>
            )}
          </div>
          <p className="font-mono text-xs text-muted-foreground">{outlet.code}</p>
          {outlet.company?.name && (
            <Badge variant="outline" className="text-[10px]">
              {outlet.company.name}
            </Badge>
          )}
          {outlet.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {outlet.address}
            </p>
          )}
          {canUpdate && onStatusChange && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <Switch
                checked={outlet.is_active}
                onCheckedChange={onStatusChange}
                disabled={isStatusChanging}
                className="cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">
                {outlet.is_active ? t("common.active") : t("common.inactive")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1 border shadow-sm">
        {onDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail();
            }}
            className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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
            className="p-1.5 rounded-full hover:bg-accent text-warning hover:text-warning transition-colors"
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
            className="p-1.5 rounded-full hover:bg-accent text-destructive hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
