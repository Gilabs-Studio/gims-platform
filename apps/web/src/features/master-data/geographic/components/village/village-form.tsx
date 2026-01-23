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
import { sortOptions } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import { useCreateVillage, useUpdateVillage } from "../../hooks/use-villages";
import { getVillageSchema, type CreateVillageFormData } from "../../schemas/geographic.schema";
import type { Village, District } from "../../types";

export interface VillageFormProps {
  open: boolean;
  onClose: () => void;
  village?: Village | null;
  districts: District[];
}

export function VillageForm({ open, onClose, village, districts }: VillageFormProps) {
  const t = useTranslations("geographic");
  const isEditing = !!village;
  const createVillage = useCreateVillage();
  const updateVillage = useUpdateVillage();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateVillageFormData>({
    resolver: zodResolver(getVillageSchema(t)),
    defaultValues: { name: "", code: "", district_id: "", postal_code: "", type: "village", is_active: true },
  });

  useEffect(() => {
    if (village) {
      reset({ name: village.name, code: village.code, district_id: village.district_id, postal_code: village.postal_code ?? "", type: village.type, is_active: village.is_active });
    } else {
      reset({ name: "", code: "", district_id: "", postal_code: "", type: "village", is_active: true });
    }
  }, [village, reset]);

  const onSubmit = async (data: CreateVillageFormData) => {
    try {
      if (isEditing && village) {
        await updateVillage.mutateAsync({ id: village.id, data });
      } else {
        await createVillage.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save village:", error);
    }
  };

  const isLoading = createVillage.isPending || updateVillage.isPending;
  const districtId = watch("district_id");
  const type = watch("type");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("village.edit") : t("village.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("district.title")}</FieldLabel>
            <Select onValueChange={(val) => setValue("district_id", val)} value={districtId}>
              <SelectTrigger>
                <SelectValue placeholder={t("village.selectDistrict")} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions(districts, (d) => d.name).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.district_id && <FieldError>{errors.district_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("village.name")}</FieldLabel>
            <Input placeholder="e.g. Lebak Siliwangi" {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("village.code")}</FieldLabel>
            <Input placeholder="e.g. ID-JB-BDG-CBL-LS" {...register("code")} />
            {errors.code && <FieldError>{errors.code.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("village.postalCode")}</FieldLabel>
            <Input placeholder="e.g. 40132" {...register("postal_code")} />
            {errors.postal_code && <FieldError>{errors.postal_code.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("village.type")}</FieldLabel>
            <Select onValueChange={(val) => setValue("type", val as "village" | "kelurahan")} value={type}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="village">{t("village.types.village")}</SelectItem>
                <SelectItem value="kelurahan">{t("village.types.kelurahan")}</SelectItem>
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
