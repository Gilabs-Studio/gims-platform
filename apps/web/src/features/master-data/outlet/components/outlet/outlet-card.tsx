"use client";

import { Store, MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function OutletCard({
  outlet,
  isSelected,
  onClick,
  onDetail,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: OutletCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary",
        !outlet.is_active && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Store className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate">{outlet.name}</h4>
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
