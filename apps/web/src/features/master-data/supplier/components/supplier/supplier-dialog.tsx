"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { SupplierTypeDialog } from "../supplier-type/supplier-type-dialog";
import { Loader2 } from "lucide-react";
import { ButtonLoading } from "@/components/loading";
import { SupplierContactList } from "./supplier-contact-list";
import { SupplierBankList } from "./supplier-bank-list";
import { useSupplierForm } from "../../hooks/use-supplier-form";
import type { Supplier, CreateContactData, CreateSupplierBankData } from "../../types";

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Supplier | null;
  /** Called after a successful create with id and name of the new item */
  onCreated?: (item: { id: string; name: string }) => void;
}

export function SupplierDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
}: SupplierDialogProps) {
  const {
    form,
    t,
    tCommon,
    isEditing,
    isSubmitting,
    isLoadingDetail,
    activeItem,
    supplierTypes,
    paymentTerms,
    businessUnits,
    isQuickCreateOpen,
    quickCreateQuery,
    openQuickCreate,
    closeQuickCreate,
    handleSupplierTypeCreated,
    onSubmit,
  } = useSupplierForm({ open, onOpenChange, editingItem, onCreated });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;


  const supplierTypeId = watch("supplier_type_id");
  const paymentTermsId = watch("payment_terms_id");
  const businessUnitId = watch("business_unit_id");
  const formContacts = watch("contacts") as CreateContactData[] ?? [];
  const formBanks = watch("bank_accounts") as CreateSupplierBankData[] ?? [];

  // Handlers for Create Mode lists
  const handleAddContact = (contact: CreateContactData) => {
    setValue("contacts", [...formContacts, contact]);
  };
  const handleUpdateContact = (index: number, contact: CreateContactData) => {
    const nextContacts = [...formContacts];
    nextContacts[index] = contact;
    setValue("contacts", nextContacts);
  };
  const handleDeleteContact = (index: number) => {
    setValue("contacts", formContacts.filter((_, i) => i !== index));
  };

  const handleAddBank = (bank: CreateSupplierBankData) => {
    setValue("bank_accounts", [...formBanks, bank]);
  };
  const handleUpdateBank = (index: number, bank: CreateSupplierBankData) => {
    const newBanks = [...formBanks];
    newBanks[index] = bank;
    setValue("bank_accounts", newBanks);
  };
  const handleDeleteBank = (index: number) => {
    setValue("bank_accounts", formBanks.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        
        {isEditing && isLoadingDetail ? (
           <div className="flex justify-center p-8">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" className="cursor-pointer">{t("sections.basicInfo")}</TabsTrigger>
                <TabsTrigger value="phones" className="cursor-pointer">{t("sections.contact")}</TabsTrigger>
                <TabsTrigger value="banks" className="cursor-pointer">{t("sections.bankAccounts")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>{t("form.name")} *</FieldLabel>
                      <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
                      {errors.name && <FieldError>{errors.name.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.supplierType")}</FieldLabel>
                      <CreatableCombobox
                        value={supplierTypeId ?? ""}
                        onValueChange={(val) => setValue("supplier_type_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                        options={supplierTypes.map(t => ({ value: t.id, label: t.name }))}
                        placeholder={t("form.supplierTypePlaceholder")}
                        createPermission="supplier_type.create"
                        createLabel={`${tCommon("create")} "{query}"`}
                        onCreateClick={(q) => openQuickCreate(q)}
                      />
                      {errors.supplier_type_id && <FieldError>{errors.supplier_type_id.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.paymentTerms")}</FieldLabel>
                      <CreatableCombobox
                        value={paymentTermsId ?? ""}
                        onValueChange={(val) => setValue("payment_terms_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                        options={paymentTerms.map((pt) => ({ value: pt.id, label: pt.code ? `${pt.code} - ${pt.name}` : pt.name }))}
                        placeholder={t("form.paymentTermsPlaceholder")}
                      />
                      {errors.payment_terms_id && <FieldError>{errors.payment_terms_id.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.businessUnit")}</FieldLabel>
                      <CreatableCombobox
                        value={businessUnitId ?? ""}
                        onValueChange={(val) => setValue("business_unit_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                        options={businessUnits.map((bu) => ({ value: bu.id, label: bu.name }))}
                        placeholder={t("form.businessUnitPlaceholder")}
                      />
                      {errors.business_unit_id && <FieldError>{errors.business_unit_id.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.contactPerson")}</FieldLabel>
                      <Input placeholder={t("form.contactPersonPlaceholder")} {...register("contact_person")} />
                      {errors.contact_person && <FieldError>{errors.contact_person.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.email")}</FieldLabel>
                      <Input placeholder={t("form.emailPlaceholder")} type="email" {...register("email")} />
                      {errors.email && <FieldError>{errors.email.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.website")}</FieldLabel>
                      <Input placeholder={t("form.websitePlaceholder")} {...register("website")} />
                      {errors.website && <FieldError>{errors.website.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.npwp")}</FieldLabel>
                      <Input placeholder={t("form.npwpPlaceholder")} {...register("npwp")} />
                      {errors.npwp && <FieldError>{errors.npwp.message}</FieldError>}
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>{t("form.address")}</FieldLabel>
                    <Textarea
                      placeholder={t("form.addressPlaceholder")}
                      className="resize-none"
                      {...register("address")}
                    />
                    {errors.address && <FieldError>{errors.address.message}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel>{t("form.notes")}</FieldLabel>
                    <Textarea
                      placeholder={t("form.notesPlaceholder")}
                      className="resize-none"
                      {...register("notes")}
                    />
                    {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                  </Field>

                  </TabsContent>
              
              <TabsContent value="phones" className="mt-4 space-y-4">
                <SupplierContactList
                  supplierId={isEditing ? editingItem?.id : undefined}
                  contacts={isEditing ? (activeItem?.contacts ?? activeItem?.phone_numbers ?? []) : formContacts}
                  onAdd={handleAddContact}
                  onUpdate={handleUpdateContact}
                  onDelete={handleDeleteContact}
                />
                {!isEditing && (
                   <p className="text-xs text-muted-foreground italic">
                    Note: Contacts added here will be saved when you click &quot;{tCommon("create")}&quot;.
                   </p>
                )}
              </TabsContent>

              <TabsContent value="banks" className="mt-4 space-y-4">
                <SupplierBankList
                  supplierId={isEditing ? editingItem?.id : undefined}
                  banks={isEditing ? (activeItem?.bank_accounts ?? []) : formBanks}
                  onAdd={handleAddBank}
                  onUpdate={handleUpdateBank}
                  onDelete={handleDeleteBank}
                />
                {!isEditing && (
                   <p className="text-xs text-muted-foreground italic">
                     Note: Bank accounts added here will be saved when you click &quot;{tCommon("create")}&quot;.
                   </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                <ButtonLoading loading={isSubmitting} loadingText="Saving...">
                  {isEditing ? tCommon("save") : tCommon("create")}
                </ButtonLoading>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>

      <SupplierTypeDialog
        open={isQuickCreateOpen}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        initialName={quickCreateQuery}
        onSuccess={handleSupplierTypeCreated}
      />
    </Dialog>
  );
}
