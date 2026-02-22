"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Customer } from "../../types";
import { useCustomerForm } from "../../hooks/use-customer-form";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Customer | null;
}

export function CustomerDialog({
  open,
  onOpenChange,
  editingItem,
}: CustomerDialogProps) {
  const {
    form,
    t,
    tCommon,
    tValidation,
    isEditing,
    isSubmitting,
    customerTypes,
    onSubmit,
  } = useCustomerForm({ open, onClose: () => onOpenChange(false), editingItem });

  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="cursor-pointer">
                {t("sections.general")}
              </TabsTrigger>
              <TabsTrigger value="financial" className="cursor-pointer">
                {t("sections.financial")}
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <Field>
                <FieldLabel>{t("form.name")}</FieldLabel>
                <Input
                  placeholder={t("form.namePlaceholder")}
                  {...register("name")}
                />
                {errors.name && <FieldError>{tValidation("nameRequired")}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>{t("form.customerType")}</FieldLabel>
                <Select
                  value={watch("customer_type_id") ?? ""}
                  onValueChange={(val) => setValue("customer_type_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("form.customerTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>{t("form.address")}</FieldLabel>
                <Textarea
                  placeholder={t("form.addressPlaceholder")}
                  className="resize-none"
                  {...register("address")}
                />
                {errors.address && <FieldError>{tValidation("addressMaxLength")}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("form.latitude")}</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-6.2088"
                    {...register("latitude")}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.longitude")}</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    placeholder="106.8456"
                    {...register("longitude")}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>{t("form.notes")}</FieldLabel>
                <Textarea
                  placeholder={t("form.notesPlaceholder")}
                  className="resize-none"
                  {...register("notes")}
                />
              </Field>
            </TabsContent>

            {/* Financial & Contact Tab */}
            <TabsContent value="financial" className="space-y-4 pt-4">
              <Field>
                <FieldLabel>{t("form.contactPerson")}</FieldLabel>
                <Input
                  placeholder={t("form.contactPersonPlaceholder")}
                  {...register("contact_person")}
                />
              </Field>

              <Field>
                <FieldLabel>{t("form.email")}</FieldLabel>
                <Input
                  type="email"
                  placeholder={t("form.emailPlaceholder")}
                  {...register("email")}
                />
                {errors.email && <FieldError>{tValidation("emailInvalid")}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>{t("form.website")}</FieldLabel>
                <Input
                  placeholder={t("form.websitePlaceholder")}
                  {...register("website")}
                />
              </Field>

              <Field>
                <FieldLabel>{t("form.npwp")}</FieldLabel>
                <Input
                  placeholder={t("form.npwpPlaceholder")}
                  {...register("npwp")}
                />
              </Field>
            </TabsContent>
          </Tabs>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FieldLabel>{t("form.isActive")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {tCommon("active")} / {tCommon("inactive")} status
              </p>
            </div>
            <Switch
              checked={watch("is_active")}
              onCheckedChange={(val) => setValue("is_active", val)}
              className="cursor-pointer"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
