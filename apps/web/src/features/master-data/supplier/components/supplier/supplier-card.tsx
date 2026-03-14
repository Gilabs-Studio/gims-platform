"use client";

import { Building2, Landmark, MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import type { Supplier } from "../../types";



interface SupplierCardProps {
  readonly supplier: Supplier;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: (key: string) => string;
  readonly onDetail?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function SupplierCard({
  supplier,
  isSelected,
  onClick,
  t,
  onDetail,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: SupplierCardProps) {
  const primaryBank = supplier.bank_accounts?.find((b) => b.is_primary) ?? supplier.bank_accounts?.[0];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary",
        !supplier.is_active && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{supplier.name}</h4>
          </div>
          {supplier.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {supplier.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {supplier.supplier_type && (
              <span className="text-xs text-muted-foreground">
                {supplier.supplier_type.name}
              </span>
            )}
            {supplier.latitude != null && supplier.longitude != null && (
              <span className="text-xs text-muted-foreground">
                {Number(supplier.latitude).toFixed(4)},
                {Number(supplier.longitude).toFixed(4)}
              </span>
            )}
          </div>
          {primaryBank && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Landmark className="h-3 w-3 shrink-0" />
              {primaryBank.bank?.name ?? "Bank"} - {primaryBank.account_number}
            </p>
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
