"use client";

import { useState, useEffect } from "react";
import { MapPin, Eye, Edit, Trash2, Users, Phone, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { contactService } from "@/features/crm/contact/services/contact-service";
import type { Contact } from "@/features/crm/contact/types";
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

/**
 * Fetches and displays a summary of contacts for a customer on hover.
 * Uses local state to avoid unnecessary re-renders of the parent list.
 */
function ContactsTooltipContent({ customerId }: { readonly customerId: string }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch contacts on mount (tooltip content only renders when hovered)
  useEffect(() => {
    let cancelled = false;
    contactService
      .list({ customer_id: customerId, per_page: 5, sort_by: "name", sort_dir: "asc" })
      .then((res) => {
        if (!cancelled) {
          setContacts(res.data ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContacts([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 min-w-[200px]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

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
        {contacts.map((contact) => (
          <div key={contact.id} className="px-2 py-1.5 rounded hover:bg-accent/50">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium truncate">{contact.name}</span>
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
            {contact.position && (
              <p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>
            )}
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
  const contactsCount = customer.contacts_count ?? 0;

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
            {/* Contacts count badge with hover tooltip */}
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
                  <ContactsTooltipContent customerId={customer.id} />
                </TooltipContent>
              </Tooltip>
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
            className="p-1.5 rounded-full hover:bg-accent text-warning hover:text-warning transition-colors"
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
            className="p-1.5 rounded-full hover:bg-accent text-destructive hover:text-destructive transition-colors"
            title={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
