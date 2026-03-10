"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { CalendarIcon, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateActivity } from "@/features/crm/activity/hooks/use-activities";
import { getActivityTypeIcon } from "@/features/crm/activity/utils";
import { useVisitReportFormData } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { leadKeys, useLeadProductItems } from "@/features/crm/lead/hooks/use-leads";
import { toast } from "sonner";
import type { ActivityType } from "@/features/crm/activity-type/types";
import type { VisitInterestQuestion } from "@/features/crm/visit-report/types";

interface EmployeeOption {
  id: string;
  employee_code: string;
  name: string;
}

interface ProductInterestItem {
  product_id: string;
  interest_level: number;
  notes: string;
  quantity: number;
  price: number;
  answers: { question_id: string; option_id: string; answer?: boolean }[];
}

interface LogActivityDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly leadId?: string;
  readonly dealId?: string;
  readonly defaultEmployeeId?: string;
  readonly employees: EmployeeOption[];
  readonly activityTypes: ActivityType[];
  readonly onSuccess?: () => void;
}

function getNowParts() {
  const now = new Date();
  return {
    date: now,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
}

export function LogActivityDialog({
  open,
  onClose,
  leadId,
  dealId,
  defaultEmployeeId,
  employees,
  activityTypes,
  onSuccess,
}: LogActivityDialogProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");
  const tVisit = useTranslations("crmVisitReport");

  const qc = useQueryClient();
  const { mutateAsync: createActivity, isPending } = useCreateActivity();

  // Form data for product interest (products list + survey questions)
  const { data: formDataRes } = useVisitReportFormData({ enabled: open });
  const products = formDataRes?.data?.products ?? [];
  const questions: VisitInterestQuestion[] = useMemo(
    () => formDataRes?.data?.interest_questions ?? [],
    [formDataRes?.data?.interest_questions],
  );

  // Pre-populate product interest from existing lead product items
  const { data: leadProductItemsRes } = useLeadProductItems(leadId ?? "", {
    enabled: open && !!leadId,
  });

  const calculateInterest = useCallback(
    (answers: { question_id: string; option_id: string; answer?: boolean }[]) => {
      if (!answers.length) return 0;
      const questionMap = new Map(questions.map((q) => [q.id, q]));
      let score = 0;
      answers.forEach((ans) => {
        const question = questionMap.get(ans.question_id);
        if (question) {
          const option = question.options.find((o) => o.id === ans.option_id);
          if (option) score += option.score;
        }
      });
      return Math.min(score, 5);
    },
    [questions],
  );

  const schema = useMemo(
    () =>
      z.object({
        activity_type_id: z
          .string()
          .min(1, t("logActivity.validation.typeRequired")),
        employee_id: z
          .string()
          .min(1, t("logActivity.validation.employeeRequired")),
        description: z
          .string()
          .min(1, t("logActivity.validation.descriptionRequired")),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const [activeTab, setActiveTab] = useState<"info" | "products">("info");
  const [productItems, setProductItems] = useState<ProductInterestItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      activity_type_id: "",
      employee_id: defaultEmployeeId ?? "",
      description: "",
    },
  });

  // Initialize date/time and reset form when dialog opens
  useEffect(() => {
    if (open) {
      const { date, time } = getNowParts();
      setSelectedDate(date);
      setSelectedTime(time);
      setCalendarOpen(false);
      setActiveTab("info");
      setProductItems([]);
      reset({
        activity_type_id: activityTypes[0]?.id ?? "",
        employee_id: defaultEmployeeId ?? "",
        description: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pre-populate product items from existing lead data, merging any manually added items
  useEffect(() => {
    if (!open) return;
    const existingItems = leadProductItemsRes?.data;
    if (!existingItems?.length) return;

    setProductItems((prev) => {
      const merged = new Map<string, ProductInterestItem>();
      for (const item of existingItems) {
        if (!item.product_id) continue;
        let restoredAnswers: { question_id: string; option_id: string; answer?: boolean }[] = [];
        if (item.last_survey_answers) {
          try {
            restoredAnswers = JSON.parse(item.last_survey_answers);
          } catch {
            restoredAnswers = [];
          }
        }
        merged.set(item.product_id, {
          product_id: item.product_id,
          interest_level: item.interest_level ?? 0,
          notes: item.notes ?? "",
          quantity: item.quantity ?? 0,
          price: item.unit_price ?? 0,
          answers: restoredAnswers,
        });
      }
      // Only preserve prev items that are user-added (product not in the API response)
      // API data is always authoritative for known products to avoid stale data from previous session
      for (const item of prev) {
        if (item.product_id && !merged.has(item.product_id)) {
          merged.set(item.product_id, item);
        }
      }
      return Array.from(merged.values());
    });
  }, [open, leadProductItemsRes]);

  // Recalculate interest_level once questions load (async timing fix)
  // The pre-populate effect may run before questions are fetched, leaving interest_level = 0
  useEffect(() => {
    if (!questions.length) return;
    setProductItems((prev) =>
      prev.map((p) =>
        p.answers.length > 0
          ? { ...p, interest_level: calculateInterest(p.answers) }
          : p,
      ),
    );
  // calculateInterest is stable (depends on questions which is the trigger here)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const selectedType = activityTypes.find(
        (at) => at.id === data.activity_type_id,
      );
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const timestamp = new Date(selectedDate);
      timestamp.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const filledProducts = productItems.filter((pi) => pi.product_id);
      const metadata: Record<string, unknown> | null =
        filledProducts.length > 0
          ? {
              products: filledProducts.map((pi) => {
                const product = products.find((p) => p.id === pi.product_id);
                const surveyAnswers = pi.answers
                  .map((ans) => {
                    const q = questions.find((q) => q.id === ans.question_id);
                    if (!q) return null;
                    const opt = q.options.find((o) => o.id === ans.option_id);
                    if (!opt) return null;
                    return { question_text: q.question_text, option_text: opt.option_text, score: opt.score };
                  })
                  .filter((sa): sa is { question_text: string; option_text: string; score: number } => sa !== null);
                return {
                  product_id: pi.product_id,
                  product_name: product?.name ?? pi.product_id,
                  product_sku: product?.code ?? undefined,
                  interest_level: pi.interest_level,
                  unit_price: pi.price || undefined,
                  quantity: pi.quantity || undefined,
                  notes: pi.notes || undefined,
                  answers: pi.answers.length > 0 ? pi.answers : undefined,
                  survey_answers: surveyAnswers.length > 0 ? surveyAnswers : undefined,
                };
              }),
            }
          : null;

      await createActivity({
        type: selectedType?.code ?? "call",
        activity_type_id: data.activity_type_id,
        employee_id: data.employee_id,
        description: data.description,
        ...(leadId ? { lead_id: leadId } : {}),
        ...(dealId ? { deal_id: dealId } : {}),
        timestamp: timestamp.toISOString(),
        ...(metadata ? { metadata } : {}),
      });

      // Invalidate lead product items so the tab reflects the newly added products
      if (leadId) {
        qc.invalidateQueries({ queryKey: leadKeys.productItems(leadId) });
      }
      toast.success(t("logActivity.created"));
      onClose();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("logActivity.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "info" | "products")}
          >
            <TabsList className="w-full mb-4">
              <TabsTrigger value="info" className="flex-1 cursor-pointer">
                {t("logActivity.title")}
              </TabsTrigger>
              <TabsTrigger value="products" className="flex-1 cursor-pointer">
                {tVisit("sections.productInterest")}
                {productItems.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {productItems.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Activity Info ── */}
            <TabsContent value="info" className="space-y-4">
              <Field orientation="vertical">
                <FieldLabel>{t("logActivity.form.type")} *</FieldLabel>
                <Controller
                  control={control}
                  name="activity_type_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue
                          placeholder={t("logActivity.form.typePlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activityTypes.map((at) => {
                          const TypeIcon = getActivityTypeIcon(at.icon);
                          return (
                            <SelectItem
                              key={at.id}
                              value={at.id}
                              className="cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="flex h-5 w-5 items-center justify-center rounded"
                                  style={{
                                    backgroundColor: `${at.badge_color}22`,
                                    color: at.badge_color,
                                  }}
                                >
                                  <TypeIcon className="h-3.5 w-3.5" />
                                </span>
                                <span style={{ color: at.badge_color }}>
                                  {at.name}
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.activity_type_id && (
                  <FieldError>{errors.activity_type_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("logActivity.form.employee")} *</FieldLabel>
                <Controller
                  control={control}
                  name="employee_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue
                          placeholder={t("logActivity.form.employeePlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem
                            key={emp.id}
                            value={emp.id}
                            className="cursor-pointer"
                          >
                            {emp.name}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({emp.employee_code})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employee_id && (
                  <FieldError>{errors.employee_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("logActivity.form.description")} *</FieldLabel>
                <Textarea
                  placeholder={t("logActivity.form.descriptionPlaceholder")}
                  rows={3}
                  {...register("description")}
                />
                {errors.description && (
                  <FieldError>{errors.description.message}</FieldError>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field orientation="vertical">
                  <FieldLabel>{t("logActivity.form.date")}</FieldLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, "dd MMM yyyy")
                          : t("logActivity.form.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            setSelectedDate(date);
                            setCalendarOpen(false);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("logActivity.form.time")}</FieldLabel>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab("products")}
                  className="cursor-pointer"
                >
                  {tVisit("sections.productInterest")} →
                </Button>
              </div>
            </TabsContent>

            {/* ── Tab 2: Product Interest ── */}
            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {tVisit("sections.productInterest")}
                </h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setProductItems((prev) => [
                      ...prev,
                      {
                        product_id: "",
                        interest_level: 0,
                        notes: "",
                        quantity: 0,
                        price: 0,
                        answers: [],
                      },
                    ])
                  }
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {tVisit("form.addProduct")}
                </Button>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                {productItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 space-y-4 relative bg-card"
                  >
                    <div className="absolute top-2 right-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setProductItems((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="cursor-pointer text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <Label>{tVisit("form.product")} *</Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(val) =>
                            setProductItems((prev) =>
                              prev.map((p, i) => {
                                if (i !== idx) return p;
                                const found = products.find((prod) => prod.id === val);
                                return {
                                  ...p,
                                  product_id: val,
                                  // Auto-fill selling price only when price is unset (0)
                                  price: p.price === 0 && found?.selling_price ? found.selling_price : p.price,
                                };
                              })
                            )
                          }
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue
                              placeholder={tVisit("form.selectProduct")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem
                                key={p.id}
                                value={p.id}
                                className="cursor-pointer"
                              >
                                {p.name} {p.code && `(${p.code})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Interest Survey using radio buttons */}
                      {questions.length > 0 && (
                        <div className="col-span-2 space-y-3 border rounded-md p-4 bg-muted/50">
                          <h4 className="text-sm font-medium">
                            {tVisit("form.interestSurvey")}
                          </h4>
                          {[...questions]
                            .sort((a, b) => a.sequence - b.sequence)
                            .map((q) => {
                              const currentAnswer = item.answers.find(
                                (a) => a.question_id === q.id,
                              );
                              return (
                                <div key={q.id} className="space-y-1.5">
                                  <Label className="text-xs">
                                    {q.question_text}
                                  </Label>
                                  <div className="flex flex-wrap gap-4">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.id}
                                        className="flex items-center gap-1.5"
                                      >
                                        <input
                                          type="radio"
                                          id={`la-${idx}-${q.id}-${opt.id}`}
                                          checked={
                                            currentAnswer?.option_id === opt.id &&
                                            currentAnswer?.answer !== false
                                          }
                                          onChange={() => {
                                            const otherAnswers =
                                              item.answers.filter(
                                                (a) =>
                                                  a.question_id !== q.id,
                                              );
                                            const newAnswers = [
                                              ...otherAnswers,
                                              {
                                                question_id: q.id,
                                                option_id: opt.id,
                                                answer: true,
                                              },
                                            ];
                                            const newScore =
                                              calculateInterest(newAnswers);
                                            setProductItems((prev) =>
                                              prev.map((p, i) =>
                                                i === idx
                                                  ? {
                                                      ...p,
                                                      answers: newAnswers,
                                                      interest_level: newScore,
                                                    }
                                                  : p,
                                              ),
                                            );
                                          }}
                                          className="h-4 w-4 cursor-pointer accent-primary"
                                        />
                                        <label
                                          htmlFor={`la-${idx}-${q.id}-${opt.id}`}
                                          className="text-xs cursor-pointer"
                                        >
                                          {opt.option_text}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          {item.answers.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {tVisit("form.calculatedInterest")}:{" "}
                              {item.interest_level}/5
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.interestLevel")} (0-5)</Label>
                        <Select
                          value={item.interest_level.toString()}
                          onValueChange={(v) =>
                            setProductItems((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, interest_level: parseInt(v) }
                                  : p,
                              )
                            )
                          }
                          disabled={
                            questions.length > 0 && item.answers.length > 0
                          }
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5].map((n) => (
                              <SelectItem
                                key={n}
                                value={n.toString()}
                                className="cursor-pointer"
                              >
                                {n} {"★".repeat(n)}
                                {"☆".repeat(5 - n)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {questions.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {tVisit("form.interestCalculated")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.notes")}</Label>
                        <Input
                          value={item.notes}
                          onChange={(e) =>
                            setProductItems((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, notes: e.target.value }
                                  : p,
                              )
                            )
                          }
                          placeholder={tVisit("form.notesPlaceholder")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.quantity")}</Label>
                        <NumericInput
                          value={item.quantity}
                          onChange={(val) =>
                            setProductItems((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, quantity: val ?? 0 } : p,
                              )
                            )
                          }
                          min={0}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.price")}</Label>
                        <NumericInput
                          value={item.price}
                          onChange={(val) =>
                            setProductItems((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, price: val ?? 0 } : p,
                              )
                            )
                          }
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {productItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {tVisit("form.noProducts")}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("logActivity.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

