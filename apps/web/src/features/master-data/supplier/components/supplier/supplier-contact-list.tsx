"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Phone, User, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { formatWhatsAppLink } from "@/lib/utils";
import { toast } from "sonner";
import { useForm, type SubmitHandler, type Resolver, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  useAddContact,
  useUpdateContact,
  useDeleteContact,
} from "../../hooks/use-suppliers";
import { useCreateContactRole } from "@/features/crm/contact-role/hooks/use-contact-role";
import { useContactFormData } from "@/features/crm/contact/hooks/use-contact";
import type { ContactRoleOptionForForm } from "@/features/crm/contact/types";
import type { SupplierContact, CreateContactData } from "../../types";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contact_role_id: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(3, "Phone number is required"),
  notes: z.string().optional(),
  is_primary: z.boolean().default(false),
});

type ContactFormData = z.infer<typeof contactSchema>;
type SupplierContactListItem = SupplierContact | CreateContactData;

interface SupplierContactListProps {
  supplierId?: string;
  contacts: SupplierContactListItem[];
  onAdd?: (contact: CreateContactData) => void;
  onUpdate?: (index: number, contact: CreateContactData) => void;
  onDelete?: (index: number) => void;
  isReadOnly?: boolean;
}

function isPersistedSupplierContact(contact: SupplierContactListItem): contact is SupplierContact {
  return "id" in contact;
}

export function SupplierContactList({
  supplierId,
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  isReadOnly = false,
}: SupplierContactListProps) {
  const t = useTranslations("crmContact");
  const tCommon = useTranslations("common");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<SupplierContactListItem | null>(null);

  const addMutation = useAddContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();
  const createContactRoleMutation = useCreateContactRole();

  const formDataQuery = useContactFormData();
  const contactRoles: ContactRoleOptionForForm[] = formDataQuery.data?.data?.contact_roles ?? [];

  const isSubmitting = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema) as Resolver<ContactFormData>,
    defaultValues: {
      name: "",
      contact_role_id: "",
      email: "",
      phone: "",
      notes: "",
      is_primary: false,
    },
  });

  const handleCreateContactRole = async (query: string) => {
    const trimmedName = query.trim();
    if (!trimmedName) return;

    try {
      const response = await createContactRoleMutation.mutateAsync({
        name: trimmedName,
      });

      if (response.data?.id) {
        setValue("contact_role_id", response.data.id, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }

      await formDataQuery.refetch();
      toast.success(tCommon("success") || "Success");
    } catch {
      toast.error(tCommon("error") || "Something went wrong");
    }
  };

  const handleOpenCreate = () => {
    setEditingIndex(null);
    setEditingItem(null);
    reset({
      name: "",
      contact_role_id: "",
      email: "",
      phone: "",
      notes: "",
      is_primary: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (index: number, item: SupplierContactListItem) => {
    setEditingIndex(index);
    setEditingItem(item);
    reset({
      name: item.name,
      contact_role_id: item.contact_role_id || "",
      email: item.email || "",
      phone: item.phone,
      notes: item.notes || "",
      is_primary: item.is_primary ?? false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (index: number, item: SupplierContactListItem) => {
    if (!confirm(tCommon("deleteConfirm") || "Are you sure?")) return;

    if (supplierId && isPersistedSupplierContact(item)) {
      try {
        await deleteMutation.mutateAsync({ supplierId, contactId: item.id });
        toast.success(t("deleted"));
      } catch {
        toast.error(tCommon("error"));
      }
      return;
    }

    if (onDelete) {
      onDelete(index);
      toast.success(t("deleted"));
    }
  };

  const onSubmit: SubmitHandler<ContactFormData> = async (data) => {
    const payload: CreateContactData = {
      ...data,
      contact_role_id: data.contact_role_id?.trim() ? data.contact_role_id : undefined,
      is_active: true,
    };

    try {
      if (supplierId) {
        if (editingItem && isPersistedSupplierContact(editingItem)) {
          await updateMutation.mutateAsync({
            supplierId,
            contactId: editingItem.id,
            data: payload,
          });
          toast.success(t("updated"));
        } else {
          await addMutation.mutateAsync({ supplierId, data: payload });
          toast.success(t("created"));
        }
      } else if (editingIndex !== null && onUpdate) {
        onUpdate(editingIndex, payload);
        toast.success(t("updated"));
      } else if (onAdd) {
        onAdd(payload);
        toast.success(t("created"));
      }

      setDialogOpen(false);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("title") || "Contacts"}</h3>
        {!isReadOnly && (
          <Button size="sm" onClick={handleOpenCreate} className="cursor-pointer" type="button">
            <Plus className="h-4 w-4 mr-1" />
            {t("addContact") || "Add Contact"}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {formDataQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
            <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("emptyState") || "No contacts found"}</p>
          </div>
        ) : (
          contacts.map((contact, index) => {
            const role = contactRoles.find((r) => r.id === contact.contact_role_id);
            const displayRole = "id" in contact && contact.contact_role ? contact.contact_role : role;

            return (
              <div
                key={"id" in contact ? contact.id : `draft-${index}`}
                className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{contact.name}</span>
                    {contact.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        {tCommon("primary") || "Primary"}
                      </Badge>
                    )}
                    {contact.is_active === false && (
                      <Badge variant="secondary" className="text-xs">
                        {tCommon("inactive") || "Inactive"}
                      </Badge>
                    )}
                    {displayRole && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: displayRole.badge_color,
                          color: displayRole.badge_color,
                        }}
                      >
                        {displayRole.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {contact.phone && (
                      <a
                        href={formatWhatsAppLink(contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {contact.notes}
                    </p>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      onClick={() => handleOpenEdit(index, contact)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                      onClick={() => void handleDelete(index, contact)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? (t("editTitle") || "Edit Contact") : (t("createTitle") || "Add Contact")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-5"
          >
            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-2">
                {t("sections.basicInfo") || "Basic Information"}
              </h4>

              <Field orientation="vertical">
                <FieldLabel>{t("form.name") || "Name"} *</FieldLabel>
                <Input placeholder={t("form.namePlaceholder") || "Enter name"} {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.contactRole") || "Role"}</FieldLabel>
                <Controller
                  control={control}
                  name="contact_role_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      options={contactRoles.map((role) => ({
                        value: role.id,
                        label: role.name,
                      }))}
                      placeholder={t("form.contactRolePlaceholder") || "Select a role"}
                      searchPlaceholder={t("searchPlaceholder") || "Search..."}
                      createPermission="crm_contact_role.create"
                      createLabel={`${tCommon("create") || "Create"} "{query}"`}
                      onCreateClick={(query) => {
                        void handleCreateContactRole(query);
                      }}
                      isLoading={formDataQuery.isLoading || createContactRoleMutation.isPending}
                    />
                  )}
                />
              </Field>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-2">
                {t("sections.contactInfo") || "Contact Information"}
              </h4>

              <Field orientation="vertical">
                <FieldLabel>{t("form.phone") || "Phone Number"} *</FieldLabel>
                <Input placeholder={t("form.phonePlaceholder") || "Enter phone number"} {...register("phone")} />
                {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.email") || "Email"}</FieldLabel>
                <Input type="email" placeholder={t("form.emailPlaceholder") || "Enter email address"} {...register("email")} />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-2">
                {t("sections.settings") || "Settings"}
              </h4>

              <Field orientation="vertical">
                <FieldLabel>{t("form.notes") || "Notes"}</FieldLabel>
                <Textarea
                  placeholder={t("form.notesPlaceholder") || "Add any additional internal notes..."}
                  className="resize-none"
                  {...register("notes")}
                />
              </Field>

              <Controller
                control={control}
                name="is_primary"
                render={({ field }) => (
                  <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FieldLabel>{t("form.isPrimary") || "Primary Contact"}</FieldLabel>
                      <p className="text-xs text-muted-foreground">
                        {t("form.primaryDescription") || "Set as the main contact person for this supplier."}
                      </p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </Field>
                )}
              />

            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                {tCommon("cancel") || "Cancel"}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {editingItem ? tCommon("save") || "Save" : tCommon("create") || "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
