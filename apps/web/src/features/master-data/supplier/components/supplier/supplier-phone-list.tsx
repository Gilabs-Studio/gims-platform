"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  useAddPhoneNumber,
  useUpdatePhoneNumber,
  useDeletePhoneNumber,
} from "../../hooks/use-suppliers";
import type { SupplierPhoneNumber, CreatePhoneNumberData } from "../../types";

const phoneSchema = z.object({
  phone_number: z.string().min(3, "Phone number is required"),
  label: z.string().optional(),
  is_primary: z.boolean().default(false),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

interface SupplierPhoneListProps {
  supplierId?: string;
  phones: CreatePhoneNumberData[];
  onAdd?: (phone: CreatePhoneNumberData) => void;
  onUpdate?: (index: number, phone: CreatePhoneNumberData) => void;
  onDelete?: (index: number) => void;
  isReadOnly?: boolean;
}

export function SupplierPhoneList({
  supplierId,
  phones,
  onAdd,
  onUpdate,
  onDelete,
  isReadOnly = false,
}: SupplierPhoneListProps) {
  const t = useTranslations("supplier.phoneNumber");
  const tCommon = useTranslations("supplier.common");
  const tValidation = useTranslations("supplier.validation");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<SupplierPhoneNumber | null>(null);

  const addMutation = useAddPhoneNumber();
  const updateMutation = useUpdatePhoneNumber();
  const deleteMutation = useDeletePhoneNumber();

  const isSubmitting = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema) as any,
    defaultValues: {
      phone_number: "",
      label: "",
      is_primary: false,
    },
  });

  const handleOpenCreate = () => {
    setEditingIndex(null);
    setEditingItem(null);
    reset({ phone_number: "", label: "", is_primary: false });
    setDialogOpen(true);
  };

  const handleOpenEdit = (index: number, item: any) => {
    setEditingIndex(index);
    setEditingItem(item);
    reset({
      phone_number: item.phone_number,
      label: item.label,
      is_primary: item.is_primary,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (index: number, item: any) => {
    if (!confirm(tCommon("deleteConfirm") || "Are you sure?")) return;

    if (supplierId && item.id) {
      try {
        await deleteMutation.mutateAsync({ supplierId, phoneId: item.id });
        toast.success(t("deleteSuccess"));
      } catch {
        toast.error("Failed to delete phone number");
      }
    } else if (onDelete) {
      onDelete(index);
      toast.success(t("deleteSuccess"));
    }
  };

  const onSubmit: SubmitHandler<PhoneFormData> = async (data) => {
    try {
      if (supplierId) {
        if (editingItem && editingItem.id) {
          await updateMutation.mutateAsync({
            supplierId,
            phoneId: editingItem.id,
            data,
          });
          toast.success("Phone number updated");
        } else {
          await addMutation.mutateAsync({
            supplierId,
            data,
          });
          toast.success("createSuccess" in t ? t("createSuccess") : "Phone number added");
        }
      } else {
        if (editingIndex !== null && onUpdate) {
          onUpdate(editingIndex, data);
          toast.success("Phone number updated");
        } else if (onAdd) {
          onAdd(data);
          toast.success("createSuccess" in t ? t("createSuccess") : "Phone number added");
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save phone number");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        {!isReadOnly && (
          <Button size="sm" onClick={handleOpenCreate} className="cursor-pointer" type="button">
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("form.phoneNumber")}</TableHead>
              <TableHead>{t("form.label")}</TableHead>
              <TableHead>{t("form.isPrimary")}</TableHead>
              {!isReadOnly && <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {phones.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isReadOnly ? 3 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              phones.map((phone, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {phone.phone_number}
                    </div>
                  </TableCell>
                  <TableCell>{phone.label || "-"}</TableCell>
                  <TableCell>
                    {phone.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(index, phone)}
                          className="h-8 w-8 cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index, phone)}
                          className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <Field>
              <FieldLabel>{t("form.phoneNumber")}</FieldLabel>
              <Input placeholder={t("form.phoneNumberPlaceholder")} {...register("phone_number")} />
              {errors.phone_number && <FieldError>{tValidation("phoneNumberRequired")}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("form.label")}</FieldLabel>
              <Input placeholder={t("form.labelPlaceholder")} {...register("label")} />
              {errors.label && <FieldError>{errors.label.message}</FieldError>}
            </Field>

            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isPrimary")}</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Set as main contact number
                </p>
              </div>
              <Controller
                control={control}
                name="is_primary"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="cursor-pointer"
                  />
                )}
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {editingItem ? tCommon("save") : tCommon("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
