"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateCompany, useUpdateCompany } from "../hooks/use-companies";
import { getCompanySchema, type CompanyFormData } from "../schemas/organization.schema";
import type { Company } from "../types";

interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
}

export function CompanyForm({ open, onClose, company }: CompanyFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!company;
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(getCompanySchema(t)),
    defaultValues: {
      name: "",
      address: "",
      email: "",
      phone: "",
      npwp: "",
      nib: "",
      village_id: null,
      director_id: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        address: company.address ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        npwp: company.npwp ?? "",
        nib: company.nib ?? "",
        village_id: company.village_id ?? null,
        director_id: company.director_id ?? null,
        is_active: company.is_active,
      });
    } else {
      reset({
        name: "",
        address: "",
        email: "",
        phone: "",
        npwp: "",
        nib: "",
        village_id: null,
        director_id: null,
        is_active: true,
      });
    }
  }, [company, reset]);

  const onSubmit = async (data: CompanyFormData) => {
    try {
      // Convert empty strings to null for optional fields
      const payload = {
        ...data,
        village_id: data.village_id || undefined,
        director_id: data.director_id || undefined,
      };
      
      if (isEditing && company) {
        await updateCompany.mutateAsync({ id: company.id, data: payload });
      } else {
        await createCompany.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save company:", error);
    }
  };

  const isLoading = createCompany.isPending || updateCompany.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("company.editTitle") : t("company.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("company.form.name")}</FieldLabel>
            <Input
              placeholder={t("company.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("company.form.address")}</FieldLabel>
            <Textarea
              placeholder={t("company.form.addressPlaceholder")}
              {...register("address")}
              rows={2}
            />
            {errors.address && <FieldError>{errors.address.message}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("company.form.email")}</FieldLabel>
              <Input
                type="email"
                placeholder={t("company.form.emailPlaceholder")}
                {...register("email")}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("company.form.phone")}</FieldLabel>
              <Input
                placeholder={t("company.form.phonePlaceholder")}
                {...register("phone")}
              />
              {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("company.form.npwp")}</FieldLabel>
              <Input
                placeholder={t("company.form.npwpPlaceholder")}
                {...register("npwp")}
              />
              {errors.npwp && <FieldError>{errors.npwp.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("company.form.nib")}</FieldLabel>
              <Input
                placeholder={t("company.form.nibPlaceholder")}
                {...register("nib")}
              />
              {errors.nib && <FieldError>{errors.nib.message}</FieldError>}
            </Field>
          </div>

          {/* Note: Geographic cascade selection and Director selection 
              would require additional components. For MVP, these can be 
              added later when Employee module is complete */}

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("company.form.isActive")}</FieldLabel>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading
                ? "Saving..."
                : isEditing
                  ? t("common.save")
                  : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
