"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, FileText, CalendarIcon, Calculator } from "lucide-react";
import {
  getTargetSchema,
  getUpdateTargetSchema,
  type CreateTargetFormData,
  type UpdateTargetFormData,
} from "../schemas/target.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, sortOptions } from "@/lib/utils";
import { useCreateYearlyTarget, useUpdateYearlyTarget, useYearlyTarget } from "../hooks/use-targets";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import type { YearlyTarget } from "../types";
import { toast } from "sonner";
import { ButtonLoading } from "@/components/loading";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "target_form_cache";

interface TargetFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target?: YearlyTarget | null;
}

export function TargetForm({ open, onClose, target }: TargetFormProps) {
  const isEdit = !!target;
  const t = useTranslations("targets");
  const createTarget = useCreateYearlyTarget();
  const updateTarget = useUpdateYearlyTarget();
  const [activeTab, setActiveTab] = useState<"basic" | "months">("basic");
  const [isValidating, setIsValidating] = useState(false);

  const { data: fullTargetData, isLoading: isLoadingTarget } = useYearlyTarget(
    target?.id ?? ""
  );

  const { data: areasData } = useAreas({ per_page: 100 });

  const areas = useMemo(() => {
    const data = areasData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [areasData?.data]);

  const schema = isEdit ? getUpdateTargetSchema(t) : getTargetSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateTargetFormData | UpdateTargetFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateTargetFormData | UpdateTargetFormData>({
    resolver: formResolver,
    defaultValues: target
      ? {
          year: target.year,
          area_id: target.area_id,
          total_target: target.total_target,
          notes: target.notes ?? "",
          months: target.monthly_targets?.map(m => ({
            month: m.month,
            target_amount: m.target_amount,
            notes: m.notes ?? "",
          })) ?? Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        }
      : {
          year: new Date().getFullYear(),
          total_target: 0,
          months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        },
  });

  const { fields } = useFieldArray({
    control,
    name: "months",
  });

  const watchedMonths = useWatch({ control, name: "months" });
  const totalTarget = useWatch({ control, name: "total_target" });
  
  // Auto-calculate total target when monthly targets change
  useEffect(() => {
    if (watchedMonths) {
      const total = watchedMonths.reduce((sum, m) => sum + (m?.target_amount ?? 0), 0);
      setValue("total_target", total, { shouldValidate: true });
    }
  }, [watchedMonths, setValue]);

  // Reset form when target data changes (for edit mode)
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullTargetData?.data) {
        const data = fullTargetData.data;
        setTimeout(() => {
          reset({
            year: data.year,
            area_id: data.area_id,
            total_target: data.total_target,
            notes: data.notes ?? "",
            months: data.monthly_targets?.map(m => ({
              month: m.month,
              target_amount: m.target_amount,
              notes: m.notes ?? "",
            })) ?? Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              target_amount: 0,
              notes: "",
            })),
          });
        }, 10);
      }
      return;
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        reset(JSON.parse(cached));
      } catch {
        reset({
          year: new Date().getFullYear(),
          total_target: 0,
          months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            target_amount: 0,
            notes: "",
          })),
        });
      }
    } else {
      reset({
        year: new Date().getFullYear(),
        total_target: 0,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          target_amount: 0,
          notes: "",
        })),
      });
    }
  }, [open, isEdit, fullTargetData, reset]);

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = ["year", "area_id", "notes"];
      const isValid = await trigger(basicFields as any);

      if (isValid) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getValues()));
        setActiveTab("months");
      } else {
        toast.error(t("common.validationError"));
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFormSubmit = async (data: CreateTargetFormData | UpdateTargetFormData) => {
    try {
      if (isEdit && target) {
        await updateTarget.mutateAsync({
          id: target.id,
          data: data as UpdateTargetFormData,
        });
        toast.success(t("updated"));
      } else {
        await createTarget.mutateAsync(data as CreateTargetFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const isLoading = createTarget.isPending || updateTarget.isPending;
  const isFormLoading = isEdit && isLoadingTarget && !fullTargetData?.data;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const onInvalid = (errors: FieldErrors<CreateTargetFormData | UpdateTargetFormData>) => {
      const basicFields = ["year", "area_id", "notes"];
      const basicError = basicFields.some((field) => 
        errors[field as keyof CreateTargetFormData | keyof UpdateTargetFormData]
      );
  
      if (basicError) {
        setActiveTab("basic");
        setTimeout(() => {
          toast.error(t("common.validationError"));
        }, 100);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t("common.basicInfo")}</TabsTrigger>
              <TabsTrigger value="months">{t("monthlyBreakdown")}</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-6 mt-4">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("area")} *</FieldLabel>
                    <Controller
                      name="area_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectArea")} />
                          </SelectTrigger>
                          <SelectContent>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.area_id && <FieldError>{errors.area_id.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("year")} *</FieldLabel>
                    <Controller
                      name="year"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(v) => field.onChange(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectYear")} />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y.toString()}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.year && <FieldError>{errors.year.message}</FieldError>}
                  </Field>
                  
                  <Field orientation="vertical" className="col-span-2">
                     <FieldLabel>{t("totalTarget")}</FieldLabel>
                     <div className="text-2xl font-bold px-3 py-2 border rounded-md bg-muted/50">
                        {formatCurrency(totalTarget || 0)}
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">
                       {t("totalCalculatedFromMonths")}
                     </p>
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("notes")}</FieldLabel>
                    <Textarea {...register("notes")} rows={3} />
                    {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                  </Field>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button type="button" onClick={handleNext} className="cursor-pointer">
                      {t("common.next")}
                    </Button>
                </div>
              </TabsContent>

              <TabsContent value="months" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-card">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">
                                    {getMonthName(index + 1)}
                                </span>
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Field orientation="vertical">
                                <FieldLabel>{t("targetAmount")}</FieldLabel>
                                <Controller
                                    name={`months.${index}.target_amount`}
                                    control={control}
                                    render={({ field }) => (
                                        <NumericInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            min={0}
                                        />
                                    )}
                                />
                            </Field>
                             <Field orientation="vertical">
                                <FieldLabel>{t("notes")}</FieldLabel>
                                <Controller
                                    name={`months.${index}.notes`}
                                    control={control}
                                    render={({ field }) => (
                                        <Textarea
                                            {...field}
                                            rows={2}
                                            placeholder={t("monthNotesPlaceholder")}
                                            className="resize-none"
                                        />
                                    )}
                                />
                            </Field>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                    {t("common.back")}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="cursor-pointer">
                    <ButtonLoading loading={isLoading}>{t("common.save")}</ButtonLoading>
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
