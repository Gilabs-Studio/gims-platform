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
import { useCreateDistrict, useUpdateDistrict } from "../../hooks/use-districts";
import { getDistrictSchema, type CreateDistrictFormData } from "../../schemas/geographic.schema";
import type { District, City } from "../../types";

export interface DistrictFormProps {
  open: boolean;
  onClose: () => void;
  district?: District | null;
  cities: City[];
}

export function DistrictForm({ open, onClose, district, cities }: DistrictFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!district;
  const createDistrict = useCreateDistrict();
  const updateDistrict = useUpdateDistrict();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateDistrictFormData>({
    resolver: zodResolver(getDistrictSchema(t)),
    defaultValues: { name: "", code: "", city_id: "", is_active: true },
  });

  useEffect(() => {
    if (district) {
      reset({ name: district.name, code: district.code, city_id: district.city_id, is_active: district.is_active });
    } else {
      reset({ name: "", code: "", city_id: "", is_active: true });
    }
  }, [district, reset]);

  const onSubmit = async (data: CreateDistrictFormData) => {
    try {
      if (isEditing && district) {
        await updateDistrict.mutateAsync({ id: district.id, data });
      } else {
        await createDistrict.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save district:", error);
    }
  };

  const isLoading = createDistrict.isPending || updateDistrict.isPending;
  const cityId = watch("city_id");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("district.edit") : t("district.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("city.title")}</FieldLabel>
            <Select onValueChange={(val) => setValue("city_id", val)} value={cityId}>
              <SelectTrigger>
                <SelectValue placeholder={t("district.selectCity")} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city_id && <FieldError>{errors.city_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("district.name")}</FieldLabel>
            <Input placeholder="e.g. Coblong" {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("district.code")}</FieldLabel>
            <Input placeholder="e.g. ID-JB-BDG-CBL" {...register("code")} />
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
