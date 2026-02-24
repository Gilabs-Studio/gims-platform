"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sortOptions } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import { useProvinceForm } from "../../hooks/use-province-form";
import type { Province, Country } from "../../types";

interface ProvinceFormProps {
  open: boolean;
  onClose: () => void;
  province?: Province | null;
  countries: Country[];
}

export function ProvinceForm({ open, onClose, province, countries }: ProvinceFormProps) {
  const { form, t, isEditing, isLoading, onSubmit } = useProvinceForm({ open, onClose, province });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const countryId = watch("country_id");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("province.edit") : t("province.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("country.title")}</FieldLabel>
            <Select onValueChange={(val) => setValue("country_id", val)} value={countryId}>
              <SelectTrigger>
                <SelectValue placeholder={t("province.selectCountry")} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions(countries, (c) => c.name).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country_id && <FieldError>{errors.country_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("province.name")}</FieldLabel>
            <Input placeholder="e.g. Jawa Barat" {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("province.code")}</FieldLabel>
            <Input placeholder="e.g. ID-JB" {...register("code")} />
            {errors.code && <FieldError>{errors.code.message}</FieldError>}
          </Field>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <FieldLabel>{t("common.active")}</FieldLabel>
            <Switch checked={isActive} onCheckedChange={(val) => setValue("is_active", val)} />
            {errors.is_active && <FieldError>{errors.is_active.message}</FieldError>}
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">{t("common.cancel")}</Button>
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
