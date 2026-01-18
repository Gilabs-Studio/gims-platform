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
import { useCreateCity, useUpdateCity } from "../../hooks/use-cities";
import { getCitySchema, type CreateCityFormData } from "../../schemas/geographic.schema";
import type { City, Province } from "../../types";

export interface CityFormProps {
  open: boolean;
  onClose: () => void;
  city?: City | null;
  provinces: Province[];
}

export function CityForm({ open, onClose, city, provinces }: CityFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!city;
  const createCity = useCreateCity();
  const updateCity = useUpdateCity();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCityFormData>({
    resolver: zodResolver(getCitySchema(t)),
    defaultValues: { name: "", code: "", province_id: "", type: "city", is_active: true },
  });

  useEffect(() => {
    if (city) {
      reset({ name: city.name, code: city.code, province_id: city.province_id, type: city.type, is_active: city.is_active });
    } else {
      reset({ name: "", code: "", province_id: "", type: "city", is_active: true });
    }
  }, [city, reset]);

  const onSubmit = async (data: CreateCityFormData) => {
    try {
      if (isEditing && city) {
        await updateCity.mutateAsync({ id: city.id, data });
      } else {
        await createCity.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save city:", error);
    }
  };

  const isLoading = createCity.isPending || updateCity.isPending;
  const provinceId = watch("province_id");
  const type = watch("type");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("city.edit") : t("city.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("province.title")}</FieldLabel>
            <Select onValueChange={(val) => setValue("province_id", val)} value={provinceId}>
              <SelectTrigger>
                <SelectValue placeholder={t("city.selectProvince")} />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.province_id && <FieldError>{errors.province_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("city.name")}</FieldLabel>
            <Input placeholder="e.g. Kota Bandung" {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("city.code")}</FieldLabel>
            <Input placeholder="e.g. ID-JB-BDG" {...register("code")} />
            {errors.code && <FieldError>{errors.code.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("city.type")}</FieldLabel>
            <Select onValueChange={(val) => setValue("type", val as "city" | "regency")} value={type}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city">{t("city.types.city")}</SelectItem>
                <SelectItem value="regency">{t("city.types.regency")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <FieldError>{errors.type.message}</FieldError>}
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
