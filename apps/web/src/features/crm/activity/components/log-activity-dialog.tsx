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
  DialogFooter,
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
import { useCreateActivity, useActivityTimeline } from "@/features/crm/activity/hooks/use-activities";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { useVisitReportFormData } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { leadKeys, useLeadProductItems } from "@/features/crm/lead/hooks/use-leads";
import { toast } from "sonner";
import type { ActivityType } from "@/features/crm/activity-type/types";
import { VISIT_INTEREST_QUESTIONS, calculateVisitInterestLevel } from "@/features/crm/visit-report/constants/interest-questions";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { ActivityTypeDialog } from "@/features/crm/activity-type/components/activity-type-dialog";

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
  const authUser = useAuthStore((state) => state.user);

  // Form data for product interest (products list)
  const { data: formDataRes } = useVisitReportFormData({ enabled: open });
  const products = formDataRes?.data?.products ?? [];
  const questions = VISIT_INTEREST_QUESTIONS;

  // Pre-populate product interest from existing lead product items
  const { data: leadProductItemsRes } = useLeadProductItems(leadId ?? "", {
    enabled: open && !!leadId,
  });

  // Fetch recent activities sorted by timestamp desc to determine the authoritative product state.
  // The latest activity's product list is the source of truth — not the accumulated DB state,
  // which may be stale due to activities being saved out of timestamp order.
  const { data: recentActivitiesRes } = useActivityTimeline(
    { lead_id: leadId, per_page: 20, sort_by: "timestamp", sort_dir: "desc" },
    { enabled: open && !!leadId },
  );

  const calculateInterest = useCallback(
    (answers: { question_id: string; option_id: string; answer?: boolean }[]) => {
      if (!answers.length) return 0;
      return calculateVisitInterestLevel(answers);
    },
    [],
  );

  const schema = useMemo(
    () =>
      z.object({
        activity_type_id: z
          .string()
          .min(1, t("logActivity.validation.typeRequired")),
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
  const [activityTypeOptions, setActivityTypeOptions] = useState<ActivityType[]>(activityTypes);
  const [activityTypeDialogOpen, setActivityTypeDialogOpen] = useState(false);
  const [activityTypeInitialName, setActivityTypeInitialName] = useState("");

  useEffect(() => {
    setActivityTypeOptions(activityTypes);
  }, [activityTypes]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      activity_type_id: "",
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
        description: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleActivityTypeCreated = useCallback((item: ActivityType) => {
    setActivityTypeOptions((current) =>
      current.some((option) => option.id === item.id) ? current : [...current, item],
    );
    setValue("activity_type_id", item.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setActivityTypeDialogOpen(false);
    setActivityTypeInitialName("");
  }, [setValue]);

  // Pre-populate product items using the LATEST ACTIVITY BY TIMESTAMP as the authoritative source.
  // This fixes a bug where saving a backdated activity (e.g. Activity 2 at 06:00, logged after
  // Visit 1 at 07:00) would cause the backend to revive products already removed by Visit 1.
  // By seeding from the latest-timestamp activity, we ensure the dialog reflects the correct
  // final state regardless of activity creation order.
  useEffect(() => {
    if (!open) return;

    // Find the most recent activity (by timestamp) that has products in its metadata.
    const latestWithProducts = recentActivitiesRes?.data?.find((a) => {
      const meta = a.metadata as { products?: unknown[] } | null;
      return Array.isArray(meta?.products) && (meta!.products as unknown[]).length > 0;
    });

    type RawProduct = { product_id?: string; interest_level?: number; notes?: string; quantity?: number; unit_price?: number };

    const latestProductMap: Map<string, RawProduct> | null = latestWithProducts
      ? new Map(
          ((latestWithProducts.metadata as { products?: RawProduct[] }).products ?? [])
            .filter((p): p is RawProduct & { product_id: string } => !!p.product_id)
            .map((p) => [p.product_id, p]),
        )
      : null;

    // If no activity has products, fall back to accumulated lead product items (minus deleted).
    const fallbackItems = (leadProductItemsRes?.data ?? []).filter(
      (i) => i.product_id && !i.is_deleted,
    );

    if (!latestProductMap && !fallbackItems.length) return;

    setProductItems((prev) => {
      const merged = new Map<string, ProductInterestItem>();

      if (latestProductMap) {
        // Seed from the latest activity's product list — only these products are "active".
        for (const [productId, p] of latestProductMap) {
          // Restore survey answer IDs from leadProductItems (activity only stores display text).
          const existing = leadProductItemsRes?.data?.find((i) => i.product_id === productId);
          let restoredAnswers: { question_id: string; option_id: string; answer?: boolean }[] = [];
          if (existing?.last_survey_answers) {
            try { restoredAnswers = JSON.parse(existing.last_survey_answers); } catch { /* ignore */ }
          }
          merged.set(productId, {
            product_id: productId,
            interest_level: p.interest_level ?? existing?.interest_level ?? 0,
            notes: p.notes ?? existing?.notes ?? "",
            quantity: p.quantity ?? existing?.quantity ?? 0,
            price: p.unit_price ?? existing?.unit_price ?? 0,
            answers: restoredAnswers,
          });
        }
      } else {
        // Fallback: accumulated lead product items (skipping soft-deleted entries).
        for (const item of fallbackItems) {
          let restoredAnswers: { question_id: string; option_id: string; answer?: boolean }[] = [];
          if (item.last_survey_answers) {
            try { restoredAnswers = JSON.parse(item.last_survey_answers); } catch { /* ignore */ }
          }
          merged.set(item.product_id!, {
            product_id: item.product_id!,
            interest_level: item.interest_level ?? 0,
            notes: item.notes ?? "",
            quantity: item.quantity ?? 0,
            price: item.unit_price ?? 0,
            answers: restoredAnswers,
          });
        }
      }

      // Preserve manually-added items from a previous open that aren't in the API data.
      for (const item of prev) {
        if (item.product_id && !merged.has(item.product_id)) {
          merged.set(item.product_id, item);
        }
      }
      return Array.from(merged.values());
    });
  }, [open, recentActivitiesRes, leadProductItemsRes]);

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
      const selectedType = activityTypeOptions.find(
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
                    return {
                      question_text: tVisit(q.question_text_key),
                      option_text: tVisit(opt.option_text_key),
                      score: opt.score,
                    };
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
        employee_id: authUser?.employee_id ?? "",
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
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t("logActivity.title")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "info" | "products")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">{t("logActivity.title")}</TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {tVisit("sections.productInterest")}
                  {productItems.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {productItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

            {/* ── Tab 1: Activity Info ── */}
            <TabsContent value="info" className="space-y-4 py-2">
              <Field orientation="vertical">
                <FieldLabel>{t("logActivity.form.type")} *</FieldLabel>
                <Controller
                  control={control}
                  name="activity_type_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          setActivityTypeOptions(activityTypes);
                        }
                      }}
                      ariaInvalid={!!errors.activity_type_id}
                      options={activityTypeOptions.map((at) => ({
                        value: at.id,
                        label: at.name,
                      }))}
                      placeholder={t("logActivity.form.typePlaceholder")}
                      createPermission="crm_activity_type.create"
                      createLabel={`${tCommon("create")} "{query}"`}
                      onCreateClick={(query) => {
                        setActivityTypeInitialName(query);
                        setActivityTypeDialogOpen(true);
                      }}
                    />
                  )}
                />
                {errors.activity_type_id && (
                  <FieldError>{errors.activity_type_id.message}</FieldError>
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
            <TabsContent value="products" className="space-y-4 py-2">
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

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 pb-10">
                {productItems.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-4 bg-card">

                    <div className="grid grid-cols-2 gap-4">
                      {/* Product Select */}
                      <div className="col-span-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label>{tVisit("form.product")} *</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setProductItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="cursor-pointer text-destructive self-start"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                            <SelectValue placeholder={tVisit("form.selectProduct")} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                                {p.name} {p.code && `(${p.code})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Interest Survey (when questions configured) */}
                      {questions.length > 0 && (
                        <div className="col-span-2 space-y-3 border rounded-md p-4 bg-muted/50 -mt-2">
                          <h4 className="text-sm font-medium">{tVisit("form.interestSurvey")}</h4>
                          {[...questions].sort((a, b) => a.sequence - b.sequence).map((q) => {
                            const currentAnswer = item.answers.find((a) => a.question_id === q.id);
                            return (
                              <div key={q.id} className="space-y-1.5">
                                <Label className="text-xs">{tVisit(q.question_text_key)}</Label>
                                <div className="flex flex-wrap gap-4">
                                  {q.options.map((opt) => (
                                    <div key={opt.id} className="flex items-center gap-1.5">
                                      <input
                                        type="radio"
                                        id={`la-${idx}-${q.id}-${opt.id}`}
                                        checked={currentAnswer?.option_id === opt.id && currentAnswer?.answer !== false}
                                        onChange={() => {
                                          const otherAnswers = item.answers.filter((a) => a.question_id !== q.id);
                                          const newAnswers = [...otherAnswers, { question_id: q.id, option_id: opt.id, answer: true }];
                                          const newScore = calculateInterest(newAnswers);
                                          setProductItems((prev) => prev.map((p, i) => (i === idx ? { ...p, answers: newAnswers, interest_level: newScore } : p)));
                                        }}
                                        className="h-4 w-4 cursor-pointer accent-primary"
                                      />
                                      <label htmlFor={`la-${idx}-${q.id}-${opt.id}`} className="text-xs cursor-pointer">
                                        {tVisit(opt.option_text_key)}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {item.answers.length > 0 && (
                            <p className="text-xs text-muted-foreground">{tVisit("form.calculatedInterest")}: {item.interest_level}/5</p>
                          )}
                        </div>
                      )}

                      {questions.length === 0 && (
                        <div className="col-span-2 text-xs text-muted-foreground p-2">{tVisit("form.noInterestSurvey")}</div>
                      )}

                      {/* Interest Level */}
                      <div className="space-y-1.5">
                        <Label>{tVisit("form.interestLevel")} (0-5)</Label>
                        <Select
                          value={item.interest_level.toString()}
                          onValueChange={(v) => setProductItems((prev) => prev.map((p, i) => (i === idx ? { ...p, interest_level: parseInt(v) } : p)))}
                          disabled={questions.length > 0 && item.answers.length > 0}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={n.toString()} className="cursor-pointer">
                                {n} {"★".repeat(n)}{"☆".repeat(5 - n)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {questions.length > 0 && <p className="text-xs text-muted-foreground">{tVisit("form.interestCalculated")}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.notes")}</Label>
                        <Input value={item.notes} onChange={(e) => setProductItems((prev) => prev.map((p, i) => (i === idx ? { ...p, notes: e.target.value } : p)))} placeholder={tVisit("form.notesPlaceholder")} />
                      </div>

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.quantity")}</Label>
                        <NumericInput value={item.quantity} onChange={(val) => setProductItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quantity: val ?? 0 } : p)))} min={0} />
                      </div>

                      <div className="space-y-1.5">
                        <Label>{tVisit("form.price")}</Label>
                        <NumericInput value={item.price} onChange={(val) => setProductItems((prev) => prev.map((p, i) => (i === idx ? { ...p, price: val ?? 0 } : p)))} min={0} />
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

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending} className="cursor-pointer">
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              {t("logActivity.submit")}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ActivityTypeDialog
        open={activityTypeDialogOpen}
        onOpenChange={(isOpen) => {
          setActivityTypeDialogOpen(isOpen);
          if (!isOpen) {
            setActivityTypeInitialName("");
          }
        }}
        editingItem={null}
        initialData={{ name: activityTypeInitialName }}
        onCreated={handleActivityTypeCreated}
      />
    </>
  );
}

