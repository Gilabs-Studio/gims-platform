"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  damageReportSchema,
  type DamageReportFormValues,
} from "../schemas/asset-borrowing.schema";
import type { AssetItem } from "../types";
import { toast } from "sonner";

interface DamageReportDialogProps {
  open: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  onSubmit: (assetId: string, data: DamageReportFormValues) => void;
}

export function DamageReportDialog({
  open,
  onClose,
  asset,
  onSubmit,
}: DamageReportDialogProps) {
  const t = useTranslations("assetBorrowing");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DamageReportFormValues>({
    resolver: zodResolver(damageReportSchema),
    defaultValues: {
      severity: "medium",
      description: "",
    },
  });

  const severityVal = watch("severity");

  if (!asset) return null;

  const handleFormSubmit = (data: DamageReportFormValues) => {
    onSubmit(asset.id, data);
    toast.success(t("messages.damageSuccess"));
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.damageTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.damageDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30 my-1">
          <p className="font-semibold text-sm">{asset.name}</p>
          <p className="text-muted-foreground">
            {t("table.assetCode")}: <span className="font-medium text-foreground">{asset.code}</span>
          </p>
          <p className="text-muted-foreground">
            {t("table.location")}: <span className="font-medium text-foreground">{asset.location}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="severity">{t("dialogs.severityLabel")}</FieldLabel>
              <Select
                value={severityVal}
                onValueChange={(val) =>
                  setValue("severity", val as DamageReportFormValues["severity"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="severity" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="cursor-pointer text-muted-foreground">Ringan (Low)</SelectItem>
                  <SelectItem value="medium" className="cursor-pointer text-warning">Sedang (Medium)</SelectItem>
                  <SelectItem value="high" className="cursor-pointer text-destructive">Berat (High)</SelectItem>
                  <SelectItem value="critical" className="cursor-pointer text-destructive font-bold">Kritis (Critical)</SelectItem>
                </SelectContent>
              </Select>
              {errors.severity && <FieldError>{errors.severity.message}</FieldError>}
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="description">{t("dialogs.damageDescLabel")}</FieldLabel>
              <Textarea
                id="description"
                rows={3}
                placeholder={t("dialogs.damageDescPlaceholder")}
                {...register("description")}
              />
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="destructive"
              className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              {t("actions.reportDamage")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
