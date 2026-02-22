"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ButtonLoading } from "@/components/loading";
import { useCountryForm } from "../../hooks/use-country-form";
import type { Country } from "../../types";

interface CountryFormProps {
  open: boolean;
  onClose: () => void;
  country?: Country | null;
}

export function CountryForm({ open, onClose, country }: CountryFormProps) {
  const { form, t, isEditing, isLoading, onSubmit } = useCountryForm({ open, onClose, country });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("country.edit") : t("country.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
              <ButtonLoading loading={isLoading} loadingText={t("common.saving")}>
                {isEditing ? t("common.update") : t("common.create")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
