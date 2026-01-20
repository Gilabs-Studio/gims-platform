"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import { useCreateWarehouse, useUpdateWarehouse } from "../../hooks/use-warehouses";
import type { Warehouse } from "../../types";

const formSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  capacity: z.number().min(0).optional().nullable(),
  address: z.string().max(500).optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface WarehouseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: Warehouse | null;
}

export function WarehouseDialog({
  open,
  onOpenChange,
  editingItem,
}: WarehouseDialogProps) {
  const t = useTranslations("warehouse");
  // tCommon alias
  const tCommon = useTranslations("warehouse");
  const isEditing = !!editingItem;

  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      capacity: null,
      address: "",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (editingItem) {
      reset({
        code: editingItem.code,
        name: editingItem.name,
        description: editingItem.description ?? "",
        capacity: editingItem.capacity ?? null,
        address: editingItem.address ?? "",
        is_active: editingItem.is_active,
      });
    } else {
      reset({
        code: "",
        name: "",
        description: "",
        capacity: null,
        address: "",
        is_active: true,
      });
    }
  }, [editingItem, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        capacity: data.capacity ?? undefined,
        address: data.address || undefined,
        is_active: data.is_active,
      };

      if (isEditing && editingItem) {
        await updateWarehouse.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(t("warehouse.updateSuccess"));
      } else {
        await createWarehouse.mutateAsync(payload);
        toast.success(t("warehouse.createSuccess"));
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save warehouse:", error);
      toast.error(t("common.error_update"));
    }
  };

  const isLoading = createWarehouse.isPending || updateWarehouse.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("warehouse.editTitle") : t("warehouse.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.code")} *</FieldLabel>
              <Input
                placeholder={t("warehouse.form.codePlaceholder")}
                {...register("code")}
              />
              {errors.code && <FieldError>{errors.code.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.name")} *</FieldLabel>
              <Input
                placeholder={t("warehouse.form.namePlaceholder")}
                {...register("name")}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          </div>

          <Field orientation="vertical">
            <FieldLabel>{t("warehouse.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("warehouse.form.descriptionPlaceholder")}
              {...register("description")}
              rows={2}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.capacity")}</FieldLabel>
              <Controller
                control={control}
                name="capacity"
                render={({ field }) => (
                  <Input
                    type="number"
                    placeholder={t("warehouse.form.capacityPlaceholder")}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || null)}
                  />
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("warehouse.form.address")}</FieldLabel>
              <Input
                placeholder={t("warehouse.form.addressPlaceholder")}
                {...register("address")}
              />
            </Field>
          </div>

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("warehouse.form.isActive")}</FieldLabel>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                t("common.save")
              ) : (
                t("common.create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
