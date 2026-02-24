"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Pencil,
  Trash2,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useContacts, useDeleteContact } from "../hooks/use-contact";
import { useUserPermission } from "@/hooks/use-user-permission";
import { ContactSidePanel } from "./contact-side-panel";
import type { Contact } from "../types";

interface CustomerContactsTabProps {
  readonly customerId: string;
}

export function CustomerContactsTab({ customerId }: CustomerContactsTabProps) {
  const t = useTranslations("crmContact");
  const tCommon = useTranslations("common");

  // Contacts are child entities of customers — use customer permissions to gate actions
  const canCreate = useUserPermission("customer.create");
  const canUpdate = useUserPermission("customer.update");
  const canDelete = useUserPermission("customer.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | "view">("create");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useContacts({
    customer_id: customerId,
    search: debouncedSearch || undefined,
    per_page: 50,
    sort_by: "name",
    sort_dir: "asc",
  });

  const deleteMutation = useDeleteContact();
  const contacts = data?.data ?? [];

  const handleCreate = () => {
    setSelectedContact(null);
    setPanelMode("create");
    setPanelOpen(true);
  };

  const handleView = (contact: Contact) => {
    setSelectedContact(contact);
    setPanelMode("view");
    setPanelOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setPanelMode("edit");
    setPanelOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleted"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handlePanelClose = () => {
    setPanelOpen(false);
    setSelectedContact(null);
  };

  return (
    <div className="space-y-3">
      {/* Header with search and add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        {canCreate && (
          <Button size="sm" onClick={handleCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1" />
            {t("addContact")}
          </Button>
        )}
      </div>

      {/* Contacts List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleView(contact)}
              onKeyDown={(e) => e.key === "Enter" && handleView(contact)}
              role="button"
              tabIndex={0}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {contact.name}
                  </span>
                  {!contact.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      {tCommon("inactive")}
                    </Badge>
                  )}
                  {contact.contact_role && (
                    <Badge
                      variant="outline"
                      className="text-xs"
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {contact.position}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {contact.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={() => handleEdit(contact)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => setDeleteId(contact.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Side Panel */}
      <ContactSidePanel
        isOpen={panelOpen}
        onClose={handlePanelClose}
        mode={panelMode}
        contact={selectedContact}
        customerId={customerId}
        onSuccess={() => void refetch()}
      />

      {/* Delete Confirmation */}
      {canDelete && (
        <DeleteDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={handleDelete}
          itemName="contact"
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
