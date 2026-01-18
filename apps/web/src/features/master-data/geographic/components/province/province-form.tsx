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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProvince, useUpdateProvince } from "../../hooks/use-provinces";
import { getProvinceSchema, type CreateProvinceFormData } from "../../schemas/geographic.schema";
import type { Province, Country } from "../../types";

interface ProvinceFormProps {
  open: boolean;
  onClose: () => void;
  province?: Province | null;
  countries: Country[];
}

export function ProvinceForm({ open, onClose, province, countries }: ProvinceFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!province;
  const createProvince = useCreateProvince();
  const updateProvince = useUpdateProvince();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateProvinceFormData>({
    resolver: zodResolver(getProvinceSchema(t)),
    defaultValues: { name: "", code: "", country_id: "", is_active: true },
  });

  useEffect(() => {
    if (province) {
      reset({ name: province.name, code: province.code, country_id: province.country_id, is_active: province.is_active });
    } else {
      reset({ name: "", code: "", country_id: "", is_active: true });
    }
  }, [province, reset]);

  const onSubmit = async (data: CreateProvinceFormData) => {
    try {
      if (isEditing && province) {
        await updateProvince.mutateAsync({ id: province.id, data });
      } else {
        await createProvince.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save province:", error);
    }
  };

  const isLoading = createProvince.isPending || updateProvince.isPending;
  const countryId = watch("country_id");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("province.edit") : t("province.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("country.title")}</FieldLabel>
            <Select onValueChange={(val) => setValue("country_id", val)} value={countryId}>
              <SelectTrigger>
                <SelectValue placeholder={t("province.selectCountry")} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
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
            <Button type="submit" disabled={isLoading} className="cursor-pointer">{isLoading ? t("common.saving") : isEditing ? t("common.update") : t("common.create")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
