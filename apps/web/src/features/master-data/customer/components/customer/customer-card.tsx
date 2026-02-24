"use client";

import { MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "../../types";

interface CustomerCardProps {
  readonly customer: Customer;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: (key: string) => string;
  readonly onDetail?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function CustomerCard({
  customer,
  isSelected,
  onClick,
  t,
  onDetail,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: CustomerCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary",
        !customer.is_active && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{customer.name}</h4>
            <span className="text-xs text-muted-foreground font-mono shrink-0">{customer.code}</span>
          </div>
          {customer.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {customer.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {customer.customer_type && (
              <span className="text-xs text-muted-foreground">{customer.customer_type.name}</span>
            )}
            {customer.latitude != null && customer.longitude != null && (
              <span className="text-xs text-muted-foreground">
                {Number(customer.latitude).toFixed(4)}, {Number(customer.longitude).toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons (hover) */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1 border shadow-sm">
        {onDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail();
            }}
            className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={t("common.viewDetails")}
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
            className="p-1.5 rounded-full hover:bg-accent text-orange-500 hover:text-orange-600 transition-colors"
            title={t("common.edit")}
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
            className="p-1.5 rounded-full hover:bg-accent text-red-500 hover:text-red-600 transition-colors"
            title={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
