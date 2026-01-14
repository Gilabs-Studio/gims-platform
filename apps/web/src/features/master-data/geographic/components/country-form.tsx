"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateCountry, useUpdateCountry } from "../hooks/use-countries";
import { getCountrySchema, type CreateCountryFormData } from "../schemas/geographic.schema";
import type { Country } from "../types";

interface CountryFormProps {
  open: boolean;
  onClose: () => void;
  country?: Country | null;
}

export function CountryForm({ open, onClose, country }: CountryFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!country;
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCountryFormData>({
    resolver: zodResolver(getCountrySchema(t)),
    defaultValues: {
      name: "",
      code: "",
      phone_code: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (country) {
      reset({
        name: country.name,
        code: country.code,
        phone_code: country.phone_code ?? "",
        is_active: country.is_active,
      });
    } else {
      reset({
        name: "",
        code: "",
        phone_code: "",
        is_active: true,
      });
    }
  }, [country, reset]);

  const onSubmit = async (data: CreateCountryFormData) => {
    try {
      if (isEditing && country) {
        await updateCountry.mutateAsync({ id: country.id, data });
      } else {
        await createCountry.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save country:", error);
    }
  };

  const isLoading = createCountry.isPending || updateCountry.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("country.edit") : t("country.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("country.name")}</FieldLabel>
            <Input placeholder="e.g. Indonesia" {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("country.code")} (ISO)</FieldLabel>
            <Input
              placeholder="e.g. ID"
              {...register("code")}
              onChange={(e) => setValue("code", e.target.value.toUpperCase())}
            />
            {errors.code && <FieldError>{errors.code.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("country.phoneCode")}</FieldLabel>
            <Input placeholder="e.g. +62" {...register("phone_code")} />
            {errors.phone_code && <FieldError>{errors.phone_code.message}</FieldError>}
          </Field>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <FieldLabel>{t("common.active")}</FieldLabel>
            <Switch checked={isActive} onCheckedChange={(val) => setValue("is_active", val)} />
            {errors.is_active && <FieldError>{errors.is_active.message}</FieldError>}
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading ? t("common.saving") : isEditing ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
