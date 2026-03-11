"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Loader2, Camera, X, Check, CalendarIcon, Plus, Trash2, Package } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";
import { useCreateVisitReport, useVisitReportFormData } from "../hooks/use-visit-reports";
import { visitReportService } from "../services/visit-report-service";
import { activityKeys } from "@/features/crm/activity/hooks/use-activities";
import { activityService } from "@/features/crm/activity/services/activity-service";
import { leadKeys, useLeadProductItems } from "@/features/crm/lead/hooks/use-leads";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { CreateVisitReportData, VisitInterestQuestion } from "../types";

const MAX_PHOTOS = 5;

interface ContactOption {
  id: string;
  name: string;
  phone: string;
}

interface LogVisitDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly leadId?: string;
  readonly dealId?: string;
  readonly customerId?: string;
  readonly contactId?: string;
  readonly defaultEmployeeId?: string;
  readonly defaultContactPerson?: string;
  readonly defaultContactPhone?: string;
  readonly contacts?: ContactOption[];
  readonly onSuccess?: () => void;
}

interface GpsState {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface ProductInterestItem {
  product_id: string;
  interest_level: number;
  notes: string;
  quantity: number;
  price: number;
  answers: { question_id: string; option_id: string; answer?: boolean }[];
}

export function LogVisitDialog({
  open,
  onClose,
  leadId,
  dealId,
  customerId,
  contactId,
  defaultEmployeeId,
  defaultContactPerson,
  defaultContactPhone,
  contacts,
  onSuccess,
}: LogVisitDialogProps) {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const authUser = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const createMutation = useCreateVisitReport();
  const { data: formDataRes } = useVisitReportFormData({ enabled: open });
  const products = formDataRes?.data?.products ?? [];
  const questions: VisitInterestQuestion[] = useMemo(
    () => formDataRes?.data?.interest_questions ?? [],
    [formDataRes?.data?.interest_questions]
  );

  // Pre-populate product interest from existing lead product items
  const { data: leadProductItemsRes } = useLeadProductItems(leadId ?? "", { enabled: open && !!leadId });

  // Fetch recent activities sorted by timestamp desc to determine the authoritative product state.
  const { data: recentActivitiesRes } = useQuery({
    queryKey: activityKeys.timeline({ lead_id: leadId, per_page: 20, sort_by: "timestamp", sort_dir: "desc" }),
    queryFn: () => activityService.timeline({ lead_id: leadId, per_page: 20, sort_by: "timestamp", sort_dir: "desc" }),
    enabled: open && !!leadId,
    staleTime: 60 * 1000,
  });

  const calculateInterest = useCallback(
    (answers: { question_id: string; option_id: string; answer?: boolean }[]) => {
      if (!answers || answers.length === 0) return 0;
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
    [questions]
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<"info" | "products">("info");

  // Form state
  const [purpose, setPurpose] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [productItems, setProductItems] = useState<ProductInterestItem[]>([]);

  // GPS check-in state only (checkout is a separate action)
  const [checkInGps, setCheckInGps] = useState<GpsState | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);

  // Date / time state
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Initialize fields from props when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      setSelectedDate(now);
      setSelectedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      setCalendarOpen(false);
      setContactPerson(defaultContactPerson ?? "");
      setContactPhone(defaultContactPhone ?? "");
      setSelectedContactId("");
    }
  }, [open, defaultContactPerson, defaultContactPhone]);

  // Pre-populate product items using the LATEST ACTIVITY BY TIMESTAMP as the authoritative source.
  // This fixes a bug where saving a backdated visit/activity would revive products already removed
  // by a more recent (higher timestamp) activity.
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

    // Fallback: accumulated lead product items (minus soft-deleted).
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

  const resetForm = useCallback(() => {
    setPurpose("");
    setContactPerson("");
    setContactPhone("");
    setSelectedContactId("");
    setPhotos([]);
    setCheckInGps(null);
    setCapturingGps(false);
    setUploadingPhoto(false);
    setCalendarOpen(false);
    setProductItems([]);
    setActiveTab("info");
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleContactSelect = useCallback((id: string) => {
    setSelectedContactId(id);
    const contact = contacts?.find((c) => c.id === id);
    if (contact) {
      setContactPerson(contact.name);
      setContactPhone(contact.phone);
    }
  }, [contacts]);

  const captureGps = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error(t("locationError"));
      return;
    }

    setCapturingGps(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      setCheckInGps({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      toast.success(t("locationCaptured"));
    } catch {
      toast.error(t("locationError"));
    } finally {
      setCapturingGps(false);
    }
  }, [t]);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const filesToUpload = Array.from(files).slice(0, remaining);
    if (filesToUpload.length === 0) return;

    setUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (const file of filesToUpload) {
        const res = await visitReportService.uploadImage(file);
        if (res.data?.url) {
          urls.push(res.data.url);
        }
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }, [photos.length, tCommon]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!purpose.trim()) {
      toast.error(t("form.purposePlaceholder"));
      return;
    }

    const payload: CreateVisitReportData = {
      visit_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_time: selectedTime || undefined,
      employee_id: authUser?.employee_id ?? "",
      lead_id: leadId ?? null,
      deal_id: dealId ?? null,
      customer_id: customerId ?? null,
      contact_id: contactId ?? null,
      purpose: purpose.trim(),
      contact_person: contactPerson.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      details: productItems
        .filter((pi) => pi.product_id)
        .map((pi) => ({
          product_id: pi.product_id,
          interest_level: pi.interest_level,
          notes: pi.notes || undefined,
          quantity: pi.quantity || undefined,
          price: pi.price || undefined,
          answers: pi.answers.length > 0 ? pi.answers : undefined,
        })),
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      const visitId = res.data?.id;

      if (!visitId) {
        toast.success(t("created"));
        handleClose();
        onSuccess?.();
        return;
      }

      // Check-in with GPS if captured
      if (checkInGps) {
        await visitReportService.checkIn(visitId, {
          latitude: checkInGps.latitude,
          longitude: checkInGps.longitude,
          accuracy: checkInGps.accuracy,
        });
      }

      // Upload photos if any
      if (photos.length > 0) {
        await visitReportService.uploadPhotos(visitId, photos);
      }

      // Submit the visit to trigger activity creation
      await visitReportService.submit(visitId);

      // Invalidate activity queries to refresh timelines
      qc.invalidateQueries({ queryKey: activityKeys.all });
      // Invalidate lead product items so the product interest tab reflects the visit's survey answers
      if (leadId) {
        qc.invalidateQueries({ queryKey: leadKeys.productItems(leadId) });
      }

      toast.success(t("created"));
      handleClose();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  }, [
    purpose, selectedDate, selectedTime,
    authUser, leadId, dealId, customerId, contactId,
    contactPerson, contactPhone, checkInGps,
    photos, productItems, createMutation, handleClose, onSuccess,
    qc, t, tCommon,
  ]);

  const hasContacts = contacts && contacts.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("logVisit")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "info" | "products")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">{t("sections.basicInfo")}</TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {t("sections.productInterest")}
              {productItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {productItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Basic Info ── */}
          <TabsContent value="info" className="space-y-4 py-2">
            {/* Contact — dropdown if contacts available, otherwise free-text inputs */}
            {hasContacts ? (
              <div className="space-y-1.5">
                <Label>{t("form.contactPerson")}</Label>
                <Select value={selectedContactId} onValueChange={handleContactSelect}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("form.contactPersonPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                        <span>{c.name}</span>
                        {c.phone && (
                          <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(contactPerson || contactPhone) && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {contactPerson && (
                      <Badge variant="secondary" className="text-xs font-normal">{contactPerson}</Badge>
                    )}
                    {contactPhone && (
                      <Badge variant="outline" className="text-xs font-normal">{contactPhone}</Badge>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("form.contactPerson")}</Label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder={t("form.contactPersonPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.contactPhone")}</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={t("form.contactPhonePlaceholder")}
                  />
                </div>
              </div>
            )}

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label>{t("form.purpose")} *</Label>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t("form.purposePlaceholder")}
                rows={2}
              />
            </div>

            {/* GPS Check-in */}
            <div className="space-y-1.5">
              <Label>{t("actions.checkIn")}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={checkInGps ? "secondary" : "outline"}
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={captureGps}
                  disabled={capturingGps}
                >
                  {capturingGps ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : checkInGps ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  {capturingGps ? t("capturingLocation") : t("actions.checkIn")}
                </Button>
                {checkInGps && (
                  <Badge variant="outline" className="text-xs">
                    {checkInGps.latitude.toFixed(5)}, {checkInGps.longitude.toFixed(5)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-1.5">
              <Label>{t("sections.photos")} ({photos.length}/{MAX_PHOTOS})</Label>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <div key={url} className="relative h-16 w-16 rounded-md overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImageUrl(url) ?? url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 cursor-pointer"
                      onClick={() => removePhoto(i)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("form.visitDate")}</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal cursor-pointer", !selectedDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd MMM yyyy") : t("form.visitDatePlaceholder")}
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
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.scheduledTime")}</Label>
                <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" size="sm" onClick={() => setActiveTab("products")} className="cursor-pointer">
                {t("sections.productInterest")} →
              </Button>
            </div>
          </TabsContent>

          {/* ── Tab 2: Product Interest ── */}
          <TabsContent value="products" className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t("sections.productInterest")}</h3>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setProductItems((prev) => [
                    ...prev,
                    { product_id: "", interest_level: 0, notes: "", quantity: 0, price: 0, answers: [] },
                  ])
                }
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("form.addProduct")}
              </Button>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 pb-10">
              {productItems.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-4 bg-card">

                  <div className="grid grid-cols-2 gap-4">
                    {/* Product Select */}
                    <div className="col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>{t("form.product")} *</Label>
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
                          <SelectValue placeholder={t("form.selectProduct")} />
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
                      <div className="col-span-2 space-y-3 border rounded-md p-4 bg-muted/50">
                        <h4 className="text-sm font-medium">{t("form.interestSurvey")}</h4>
                        {[...questions].sort((a, b) => a.sequence - b.sequence).map((q) => {
                          const currentAnswer = item.answers.find((a) => a.question_id === q.id);
                          return (
                            <div key={q.id} className="space-y-1.5">
                              <Label className="text-xs">{q.question_text}</Label>
                              <div className="flex flex-wrap gap-4">
                                {q.options.map((opt) => (
                                  <div key={opt.id} className="flex items-center gap-1.5">
                                    <input
                                      type="radio"
                                      id={`lv-${idx}-${q.id}-${opt.id}`}
                                      checked={currentAnswer?.option_id === opt.id && currentAnswer?.answer !== false}
                                      onChange={() => {
                                        const otherAnswers = item.answers.filter((a) => a.question_id !== q.id);
                                        const newAnswers = [...otherAnswers, { question_id: q.id, option_id: opt.id, answer: true }];
                                        const newScore = calculateInterest(newAnswers);
                                        setProductItems((prev) =>
                                          prev.map((p, i) =>
                                            i === idx ? { ...p, answers: newAnswers, interest_level: newScore } : p
                                          )
                                        );
                                      }}
                                      className="h-4 w-4 cursor-pointer accent-primary"
                                    />
                                    <label htmlFor={`lv-${idx}-${q.id}-${opt.id}`} className="text-xs cursor-pointer">
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
                            {t("form.calculatedInterest")}: {item.interest_level}/5
                          </p>
                        )}
                      </div>
                    )}

                    {questions.length === 0 && (
                      <div className="col-span-2 text-xs text-muted-foreground p-2">
                        {t("form.noInterestSurvey")}
                      </div>
                    )}

                    {/* Interest Level */}
                    <div className="space-y-1.5">
                      <Label>{t("form.interestLevel")} (0-5)</Label>
                      <Select
                        value={item.interest_level.toString()}
                        onValueChange={(v) =>
                          setProductItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, interest_level: parseInt(v) } : p))
                          )
                        }
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
                      {questions.length > 0 && (
                        <p className="text-xs text-muted-foreground">{t("form.interestCalculated")}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label>{t("form.notes")}</Label>
                      <Input
                        value={item.notes}
                        onChange={(e) =>
                          setProductItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, notes: e.target.value } : p))
                          )
                        }
                        placeholder={t("form.notesPlaceholder")}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <Label>{t("form.quantity")}</Label>
                      <NumericInput
                        value={item.quantity}
                        onChange={(val) =>
                          setProductItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, quantity: val ?? 0 } : p))
                          )
                        }
                        min={0}
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-1.5">
                      <Label>{t("form.price")}</Label>
                      <NumericInput
                        value={item.price}
                        onChange={(val) =>
                          setProductItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, price: val ?? 0 } : p))
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
                  {t("form.noProducts")}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="cursor-pointer">
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !purpose.trim()}
            className="cursor-pointer"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <MapPin className="h-4 w-4 mr-1.5" />
            )}
            {t("logVisit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
