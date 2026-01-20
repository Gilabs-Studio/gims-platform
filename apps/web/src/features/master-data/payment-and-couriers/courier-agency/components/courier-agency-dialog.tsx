"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { toast } from "sonner";
import { useCreateCourierAgency, useUpdateCourierAgency } from "../hooks/use-courier-agency";
import type { CourierAgency } from "../types";

const courierAgencySchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  tracking_url: z.string().max(255).optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof courierAgencySchema>;

interface CourierAgencyDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: CourierAgency | null;
}

export function CourierAgencyDialog({
  open,
  onOpenChange,
  editingItem,
}: CourierAgencyDialogProps) {
  const t = useTranslations("courierAgency");
  const tCommon = useTranslations("common");

  const createMutation = useCreateCourierAgency();
  const updateMutation = useUpdateCourierAgency();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(courierAgencySchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      phone: "",
      address: "",
      tracking_url: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingItem) {
      reset({
        code: editingItem.code,
        name: editingItem.name,
        description: editingItem.description ?? "",
        phone: editingItem.phone ?? "",
        address: editingItem.address ?? "",
        tracking_url: editingItem.tracking_url ?? "",
        is_active: editingItem.is_active,
      });
    } else {
      reset({
        code: "",
        name: "",
        description: "",
        phone: "",
        address: "",
        tracking_url: "",
        is_active: true,
      });
    }
  }, [editingItem, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created"));
      }
      onOpenChange(false);
      reset();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isActive = watch("is_active");
  const trackingUrl = watch("tracking_url");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("form.code")}</FieldLabel>
              <Input placeholder={t("form.codePlaceholder")} {...register("code")} />
              {errors.code && <FieldError>{errors.code.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{t("form.name")}</FieldLabel>
              <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("form.phone")}</FieldLabel>
            <Input placeholder={t("form.phonePlaceholder")} {...register("phone")} />
            {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>
              {t("form.trackingUrl")}
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Test Link
                </a>
              )}
            </FieldLabel>
            <Input placeholder={t("form.trackingUrlPlaceholder")} {...register("tracking_url")} />
            {errors.tracking_url && <FieldError>{errors.tracking_url.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.address")}</FieldLabel>
            <Textarea placeholder={t("form.addressPlaceholder")} {...register("address")} />
            {errors.address && <FieldError>{errors.address.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea placeholder={t("form.descriptionPlaceholder")} {...register("description")} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FieldLabel>{t("form.isActive")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {isActive ? tCommon("active") : tCommon("inactive")} status
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
              className="cursor-pointer"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
