"use client";

import { Eye, Edit, Trash2, Users, Phone, Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { Supplier } from "../../types";

interface SupplierCardProps {
  readonly supplier: Supplier;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: (key: string) => string;
  readonly tCommon: (key: string) => string;
  readonly onDetail?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

function ContactsTooltipContent({
  contacts,
}: {
  readonly contacts: NonNullable<Supplier["contacts"]>;
}) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className="p-2 min-w-[200px]">
        <p className="text-xs text-muted-foreground">No contacts</p>
      </div>
    );
  }

  return (
    <div className="min-w-[220px] max-w-[300px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-1.5 pb-1">
        Contacts
      </p>
      <div className="space-y-0.5">
        {contacts.slice(0, 5).map((contact) => (
          <div key={contact.id ?? `${contact.name}-${contact.phone}`} className="px-2 py-1.5 rounded hover:bg-accent/50">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium truncate">{contact.name}</span>
              {contact.is_primary && (
                <Badge variant="outline" className="text-[9px] h-3.5 px-1 shrink-0">
                  Primary
                </Badge>
              )}
              {contact.contact_role && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-3.5 px-1 shrink-0"
                  style={{
                    borderColor: contact.contact_role.badge_color,
                    color: contact.contact_role.badge_color,
                  }}
                >
                  {contact.contact_role.name}
                </Badge>
              )}

            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {contact.phone && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Phone className="h-2.5 w-2.5" />
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                  <Mail className="h-2.5 w-2.5 shrink-0" />
                  {contact.email}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupplierCard({
  supplier,
  isSelected,
  onClick,
  t,
  tCommon,
  onDetail,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: SupplierCardProps) {
  const contacts = supplier.contacts ?? supplier.phone_numbers ?? [];
  const contactsCount = contacts.length;

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
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{supplier.name}</h4>
            <span className="text-xs text-muted-foreground font-mono shrink-0">{supplier.code}</span>
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
                {Number(supplier.latitude).toFixed(4)}, {Number(supplier.longitude).toFixed(4)}
              </span>
            )}
            {contactsCount > 0 && (
              <Tooltip delayDuration={300}>
                <TooltipTrigger>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 gap-0.5 cursor-default"
                  >
                    <Users className="h-2.5 w-2.5" />
                    {contactsCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="p-0">
                  <ContactsTooltipContent contacts={contacts} />
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1 border shadow-sm">
        {onDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail();
            }}
            className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={tCommon("viewDetails")}
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
            title={tCommon("edit")}
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
            title={tCommon("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
