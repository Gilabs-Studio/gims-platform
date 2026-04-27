"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver, type SubmitHandler, Controller } from "react-hook-form";
import { z } from "zod";
import { Plus, Pencil, Trash2, User, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { formatWhatsAppLink } from "@/lib/utils";
import { useContactFormData } from "@/features/crm/contact/hooks/use-contact";
import { useCreateContactRole } from "@/features/crm/contact-role/hooks/use-contact-role";
import type { ContactRoleOptionForForm } from "@/features/crm/contact/types";

export type DraftCustomerContact = {
  name: string;
  contact_role_id?: string | null;
  phone?: string;
  email?: string;
  notes?: string;
  is_active?: boolean;
};

interface CustomerDraftContactListProps {
  contacts: DraftCustomerContact[];
  onAdd: (contact: DraftCustomerContact) => void;
  onUpdate: (index: number, contact: DraftCustomerContact) => void;
  onDelete: (index: number) => void;
}

const draftContactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contact_role_id: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type DraftContactFormData = z.infer<typeof draftContactSchema>;

export function CustomerDraftContactList({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
}: CustomerDraftContactListProps) {
  const t = useTranslations("crmContact");
  const tCommon = useTranslations("common");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const formDataQuery = useContactFormData();
  const createContactRoleMutation = useCreateContactRole();
  const contactRoles: ContactRoleOptionForForm[] = formDataQuery.data?.data?.contact_roles ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<DraftContactFormData>({
    resolver: zodResolver(draftContactSchema) as Resolver<DraftContactFormData>,
    defaultValues: {
      name: "",
      contact_role_id: "",
      email: "",
      phone: "",
      notes: "",
      is_active: true,
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
      toast.success(tCommon("savedSuccessfully"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      name: "",
      contact_role_id: "",
      email: "",
      phone: "",
      notes: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = contacts[index];
    setEditingIndex(index);
    reset({
      name: item.name,
      contact_role_id: item.contact_role_id ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      notes: item.notes ?? "",
      is_active: item.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const onSubmit: SubmitHandler<DraftContactFormData> = async (data) => {
    const payload: DraftCustomerContact = {
      name: data.name,
      contact_role_id: data.contact_role_id || null,
      phone: data.phone || undefined,
      email: data.email || undefined,
      notes: data.notes || undefined,
      is_active: data.is_active,
    };

    if (editingIndex !== null) {
      onUpdate(editingIndex, payload);
    } else {
      onAdd(payload);
    }

    setDialogOpen(false);
    setEditingIndex(null);
    reset();
  };

  const handleDeleteConfirm = () => {
    if (deleteIndex === null) return;
    onDelete(deleteIndex);
    setDeleteIndex(null);
  };

  const roleLabelById = new Map(contactRoles.map((r) => [r.id, r.name]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <Button type="button" size="sm" onClick={handleOpenAdd} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1" />
          {t("addContact")}
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground rounded-lg border border-dashed">
          <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("noContacts")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact, index) => (
            <div
              key={`${contact.name}-${contact.phone ?? ""}-${index}`}
              className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{contact.name}</span>
                  {contact.is_active === false && (
                    <Badge variant="secondary" className="text-xs">
                      {tCommon("inactive")}
                    </Badge>
                  )}
                  {contact.contact_role_id && roleLabelById.get(contact.contact_role_id) && (
                    <Badge variant="outline" className="text-xs">
                      {roleLabelById.get(contact.contact_role_id)}
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
              </div>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => handleOpenEdit(index)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => setDeleteIndex(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-2">{t("sections.basicInfo")}</h4>

              <Field orientation="vertical">
                <FieldLabel>{t("form.name")} *</FieldLabel>
                <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.contactRole")}</FieldLabel>
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
                      placeholder={t("form.contactRolePlaceholder")}
                      searchPlaceholder={t("searchPlaceholder")}
                      createPermission="crm_contact_role.create"
                      createLabel={`${tCommon("create")} "{query}"`}
                      onCreateClick={(query) => {
                        void handleCreateContactRole(query);
                      }}
                      isLoading={createContactRoleMutation.isPending}
                    />
                  )}
                />
              </Field>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-2">{t("sections.contactInfo")}</h4>

              <Field orientation="vertical">
                <FieldLabel>{t("form.phone")}</FieldLabel>
                <Input placeholder={t("form.phonePlaceholder")} {...register("phone")} />
                {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.email")}</FieldLabel>
                <Input type="email" placeholder={t("form.emailPlaceholder")} {...register("email")} />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>
            </div>

            <div className="space-y-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.notes")}</FieldLabel>
                <Textarea
                  placeholder={t("form.notesPlaceholder")}
                  className="resize-none"
                  {...register("notes")}
                />
              </Field>

              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FieldLabel>{t("form.isActive")}</FieldLabel>
                      <p className="text-xs text-muted-foreground">{t("form.activeDescription")}</p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </Field>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                {tCommon("cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={createContactRoleMutation.isPending}>
                {createContactRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingIndex !== null ? tCommon("save") : tCommon("add")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIndex(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={deleteIndex !== null ? contacts[deleteIndex]?.name : t("singular")}
      />
    </div>
  );
}
