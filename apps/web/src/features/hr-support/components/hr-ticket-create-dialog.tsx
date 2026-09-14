"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Upload, X, Camera, Box, Users } from "lucide-react";
import {
  createHRTicketSchema,
  type CreateHRTicketFormValues,
} from "../schemas/hr-ticket.schema";

interface HRTicketCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHRTicketFormValues) => void;
}

export function HRTicketCreateDialog({ open, onClose, onSubmit }: HRTicketCreateDialogProps) {
  const t = useTranslations("hrSupport");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateHRTicketFormValues>({
    resolver: zodResolver(createHRTicketSchema),
    defaultValues: {
      title: "",
      asset_name: "",
      asset_code: "",
      category: "hr_asset_repair",
      priority: "medium",
      location: "",
      description: "",
      photos: [],
    },
  });

  const categoryVal = watch("category");
  const priorityVal = watch("priority");

  const handleResetDialog = () => {
    setPhotoPreviews([]);
    reset();
    onClose();
  };

  const handleFormSubmit = (data: CreateHRTicketFormValues) => {
    onSubmit({
      ...data,
      photos: photoPreviews,
    });
    handleResetDialog();
  };

  const handleAddSamplePhoto = () => {
    const samplePhotos = [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=800&q=80",
    ];
    const randomPhoto = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    if (photoPreviews.length < 3) {
      setPhotoPreviews((prev) => [...prev, randomPhoto]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleResetDialog()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            {t("dialogs.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dialogs.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* Title */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="title">{t("dialogs.fields.title")}</FieldLabel>
              <Input
                id="title"
                placeholder={t("dialogs.fields.titlePlaceholder")}
                {...register("title")}
              />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            {/* Asset Name & Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="asset_name">{t("dialogs.fields.assetName")}</FieldLabel>
                <Input
                  id="asset_name"
                  placeholder={t("dialogs.fields.assetNamePlaceholder")}
                  {...register("asset_name")}
                />
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="asset_code">{t("dialogs.fields.assetCode")}</FieldLabel>
                <Input
                  id="asset_code"
                  placeholder={t("dialogs.fields.assetCodePlaceholder")}
                  {...register("asset_code")}
                />
              </Field>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="category">{t("dialogs.fields.category")}</FieldLabel>
                <Select
                  value={categoryVal}
                  onValueChange={(val) =>
                    setValue("category", val as CreateHRTicketFormValues["category"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="category" className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr_asset_repair" className="cursor-pointer">
                      {t("categories.hr_asset_repair")}
                    </SelectItem>
                    <SelectItem value="hr_asset_replacement" className="cursor-pointer">
                      {t("categories.hr_asset_replacement")}
                    </SelectItem>
                    <SelectItem value="hr_facility_building" className="cursor-pointer">
                      {t("categories.hr_facility_building")}
                    </SelectItem>
                    <SelectItem value="hr_payroll_admin" className="cursor-pointer">
                      {t("categories.hr_payroll_admin")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <FieldError>{errors.category.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="priority">{t("dialogs.fields.priority")}</FieldLabel>
                <Select
                  value={priorityVal}
                  onValueChange={(val) =>
                    setValue("priority", val as CreateHRTicketFormValues["priority"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="priority" className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="cursor-pointer">
                      {t("priority.low")}
                    </SelectItem>
                    <SelectItem value="medium" className="cursor-pointer text-primary">
                      {t("priority.medium")}
                    </SelectItem>
                    <SelectItem value="high" className="cursor-pointer text-amber-600 font-semibold">
                      {t("priority.high")}
                    </SelectItem>
                    <SelectItem value="urgent" className="cursor-pointer text-rose-600 font-bold">
                      {t("priority.urgent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && <FieldError>{errors.priority.message}</FieldError>}
              </Field>
            </div>

            {/* Location */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="location">{t("dialogs.fields.location")}</FieldLabel>
              <Input
                id="location"
                placeholder={t("dialogs.fields.locationPlaceholder")}
                {...register("location")}
              />
              {errors.location && <FieldError>{errors.location.message}</FieldError>}
            </Field>

            {/* Description */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="description">{t("dialogs.fields.description")}</FieldLabel>
              <Textarea
                id="description"
                rows={3}
                placeholder={t("dialogs.fields.descriptionPlaceholder")}
                {...register("description")}
              />
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            {/* Photos Upload / Preview */}
            <Field className="space-y-2">
              <FieldLabel>{t("dialogs.fields.photos")}</FieldLabel>
              <FieldDescription className="text-xs">
                {t("dialogs.fields.photosDesc")}
              </FieldDescription>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {photoPreviews.map((url, idx) => (
                  <div key={idx} className="relative h-20 w-24 rounded-md border overflow-hidden group">
                    <img src={url} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {photoPreviews.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSamplePhoto}
                    className="h-20 w-24 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-600 text-muted-foreground hover:text-emerald-600 transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{t("dialogs.fields.takePhoto")}</span>
                  </Button>
                )}
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetDialog}
              className="cursor-pointer"
            >
              {t("dialogs.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("dialogs.actions.submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
