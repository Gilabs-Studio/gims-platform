"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, MapPin, Navigation, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { resolveImageUrl } from "@/lib/utils";
import type {
  ActiveVisitRoute,
  ActivityTypeOption,
  VisitCheckpoint,
  VisitEvent,
  VisitOutcomeOption,
  VisitPlannerProductOption,
  VisitProductInterestInput,
} from "../types";

const MAX_PHOTOS = 5;

export interface VisitActionPayload {
  event: VisitEvent;
  notes?: string;
  outcome?: string;
  activity_type?: string;
  photos?: string[];
  product_interests?: VisitProductInterestInput[];
}

interface ProductInterestEntry {
  localId: string;
  product_id: string;
  product_name: string;
  product_code: string;
  interest_level: number;
  quantity?: number;
  price?: number;
  notes?: string;
}

interface VisitDetailsInlineProps {
  route: ActiveVisitRoute | null;
  checkpoint: VisitCheckpoint | null;
  outcomes: VisitOutcomeOption[];
  activityTypes: ActivityTypeOption[];
  products: VisitPlannerProductOption[];
  canSubmit: boolean;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  onUploadImage: (file: File) => Promise<string | null>;
  onSubmitAction: (payload: VisitActionPayload) => Promise<void>;
}

function toStatusLabelKey(status: string): string {
  switch (status) {
    case "pending":
      return "status.pending";
    case "checked_in":
    case "in_progress":
      return "status.checkedIn";
    case "checked_out":
      return "status.checkedOut";
    case "completed":
      return "status.completed";
    case "skipped":
      return "status.skipped";
    default:
      return "status.pending";
  }
}

export function VisitDetailsInline({
  route,
  checkpoint,
  outcomes,
  activityTypes,
  products,
  canSubmit,
  isSubmitting,
  isUploadingImage,
  onUploadImage,
  onSubmitAction,
}: VisitDetailsInlineProps) {
  const t = useTranslations("visitPlanner");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Documentation tab
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [activityType, setActivityType] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Restore draft from sessionStorage on mount (keyed by checkpoint ID).
  // The component remounts when the checkpoint changes via `key={checkpoint?.id}`,
  // so this effect reliably loads per-checkpoint drafts.
  useEffect(() => {
    if (typeof window === "undefined" || !checkpoint?.id) return;
    try {
      const saved = sessionStorage.getItem(`visit-draft-${checkpoint.id}`);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        notes?: string;
        outcome?: string;
        activityType?: string;
        photoUrls?: string[];
        productInterests?: ProductInterestEntry[];
      };
      if (draft.notes !== undefined) setNotes(draft.notes);
      if (draft.outcome !== undefined) setOutcome(draft.outcome);
      if (draft.activityType !== undefined) setActivityType(draft.activityType);
      if (draft.photoUrls !== undefined) setPhotoUrls(draft.photoUrls);
      if (draft.productInterests !== undefined) setProductInterests(draft.productInterests);
    } catch {
      // Ignore malformed draft data.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Product interest tab
  const [productInterests, setProductInterests] = useState<ProductInterestEntry[]>([]);
  const [draftProductId, setDraftProductId] = useState("");
  const [draftLevel, setDraftLevel] = useState("3");
  const [draftQty, setDraftQty] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  const status = checkpoint?.status ?? "pending";
  const isSelectable = checkpoint?.can_select ?? false;
  const hasCoordinates =
    typeof checkpoint?.latitude === "number" && typeof checkpoint?.longitude === "number";

  const canCheckIn = canSubmit && isSelectable && hasCoordinates && status === "pending";
  const canCheckOut =
    canSubmit && isSelectable && hasCoordinates && (status === "checked_in" || status === "in_progress");
  const canComplete =
    canSubmit && isSelectable && hasCoordinates && (status === "checked_out" || status === "completed");

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const availableSlots = Math.max(0, MAX_PHOTOS - photoUrls.length);
    if (availableSlots === 0) {
      toast.error(t("form.photos.maxReached"));
      return;
    }
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    const uploaded: string[] = [];
    for (const file of selectedFiles) {
      try {
        const uploadedUrl = await onUploadImage(file);
        if (uploadedUrl) uploaded.push(uploadedUrl);
      } catch {
        toast.error(tCommon("error"));
      }
    }
    if (uploaded.length > 0) {
      setPhotoUrls((prev) => [...prev, ...uploaded]);
      toast.success(t("form.photos.uploaded"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddProductInterest = () => {
    if (!draftProductId) return;
    const product = products.find((p) => p.id === draftProductId);
    if (!product) return;
    const qtyNum = Number(draftQty);
    const priceNum = Number(draftPrice);
    setProductInterests((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${Math.random()}`,
        product_id: draftProductId,
        product_name: product.name,
        product_code: product.code,
        interest_level: Math.min(5, Math.max(0, Number(draftLevel))),
        quantity: draftQty.trim() && Number.isFinite(qtyNum) ? qtyNum : undefined,
        price: draftPrice.trim() && Number.isFinite(priceNum) ? priceNum : undefined,
        notes: draftNotes.trim() || undefined,
      },
    ]);
    setDraftProductId("");
    setDraftLevel("3");
    setDraftQty("");
    setDraftPrice("");
    setDraftNotes("");
  };

  const submitAction = async (event: VisitEvent) => {
    if (!checkpoint) return;
    await onSubmitAction({
      event,
      notes: notes.trim() || undefined,
      outcome: outcome || undefined,
      activity_type: activityType || undefined,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      product_interests:
        productInterests.length > 0
          ? productInterests.map((item) => ({
              product_id: item.product_id,
              interest_level: item.interest_level,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            }))
          : undefined,
    });
    // Clear saved draft after a successful action submission.
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`visit-draft-${checkpoint.id}`);
    }
  };

  const handleSaveNotes = () => {
    if (!checkpoint) return;
    try {
      sessionStorage.setItem(
        `visit-draft-${checkpoint.id}`,
        JSON.stringify({ notes, outcome, activityType, photoUrls, productInterests }),
      );
      toast.success(t("toast.draftSaved"));
    } catch {
      // sessionStorage write failure (e.g. private mode quota) — non-fatal.
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card/95 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm">{t("panel.detailsTitle")}</p>
          <Badge variant="outline">{t(toStatusLabelKey(status))}</Badge>
        </div>
        {checkpoint ? (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-sm font-medium">{checkpoint.name}</p>
            <p className="text-xs text-muted-foreground">
              {route?.employee_name ? `${route.employee_name} · ` : ""}
              {t("sidebar.sequence", { value: checkpoint.sequence })}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {hasCoordinates
                ? `${checkpoint.latitude?.toFixed(5)}, ${checkpoint.longitude?.toFixed(5)}`
                : t("panel.locationMissing")}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{t("panel.detailsDescription")}</p>
        )}
      </div>

      {/* Body */}
      {!checkpoint ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("state.selectCheckpoint")}</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="documentation" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-2 grid grid-cols-2 shrink-0">
            <TabsTrigger value="documentation" className="cursor-pointer">
              {t("tabs.documentation")}
            </TabsTrigger>
            <TabsTrigger value="products" className="cursor-pointer">
              {t("tabs.products")}
              {productInterests.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 text-xs font-medium text-primary">
                  {productInterests.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="min-h-0 flex-1">
            {/* Documentation Tab */}
            <TabsContent value="documentation" className="m-0 space-y-3 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="visit-notes">{t("form.notes")}</Label>
                <Textarea
                  id="visit-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("form.notesPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="visit-outcome">{t("form.outcome")}</Label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger id="visit-outcome" className="cursor-pointer">
                      <SelectValue placeholder={t("form.outcomePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {outcomes.map((item) => (
                        <SelectItem key={item.value} value={item.value} className="cursor-pointer">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="visit-activity-type">{t("form.activityType")}</Label>
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger id="visit-activity-type" className="cursor-pointer">
                      <SelectValue placeholder={t("form.activityTypePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((item) => (
                        <SelectItem key={item.value} value={item.value} className="cursor-pointer">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("form.photos.label")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={isUploadingImage || photoUrls.length >= MAX_PHOTOS}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {t("form.photos.upload")}
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadFiles(e.target.files);
                  }}
                />

                {photoUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photoUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-md border">
                        <Image
                          src={resolveImageUrl(url) ?? url}
                          alt={t("form.photos.previewAlt", { index: index + 1 })}
                          width={240}
                          height={150}
                          unoptimized
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-background/90 p-1 text-muted-foreground transition hover:text-foreground"
                          onClick={() => setPhotoUrls((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={t("form.photos.remove")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("form.photos.empty")}</p>
                )}
              </div>
            </TabsContent>

            {/* Product Interest Tab */}
            <TabsContent value="products" className="m-0 space-y-3 p-3">
              {/* Add form */}
              <div className="space-y-2.5 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">{t("form.product.addTitle")}</p>

                <Select value={draftProductId} onValueChange={setDraftProductId}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("form.product.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id} className="cursor-pointer">
                        {product.code} — {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("form.product.interestLevel")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={draftLevel}
                      onChange={(e) => setDraftLevel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("form.product.qty")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draftQty}
                      onChange={(e) => setDraftQty(e.target.value)}
                      placeholder={t("form.product.optionalShort")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("form.product.price")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(e.target.value)}
                      placeholder={t("form.product.optionalShort")}
                    />
                  </div>
                </div>

                <Textarea
                  rows={2}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder={t("form.product.notesPlaceholder")}
                />

                <Button
                  type="button"
                  size="sm"
                  className="w-full cursor-pointer"
                  disabled={!draftProductId}
                  onClick={handleAddProductInterest}
                >
                  <Plus className="h-4 w-4" />
                  {t("form.product.add")}
                </Button>
              </div>

              {/* Added product interests list */}
              {productInterests.length > 0 ? (
                <div className="space-y-2">
                  {productInterests.map((item) => (
                    <div
                      key={item.localId}
                      className="flex items-start gap-2 rounded-md border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {item.product_code} — {item.product_name}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>
                            {t("form.product.interestLevel")}: {item.interest_level}/5
                          </span>
                          {item.quantity !== undefined ? (
                            <span>{t("form.product.qty")}: {item.quantity}</span>
                          ) : null}
                          {item.price !== undefined ? (
                            <span>{t("form.product.price")}: {item.price.toLocaleString()}</span>
                          ) : null}
                        </div>
                        {item.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="mt-0.5 cursor-pointer text-muted-foreground transition hover:text-destructive"
                        onClick={() =>
                          setProductInterests((prev) =>
                            prev.filter((entry) => entry.localId !== item.localId),
                          )
                        }
                        aria-label={tCommon("remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">{t("form.product.empty")}</p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}

      {/* Action buttons - always anchored at bottom */}
      {checkpoint ? (
        <div className="shrink-0 border-t p-3 space-y-2">
          {/* Save draft button — persists notes/outcome/photos to sessionStorage */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full cursor-pointer"
            onClick={handleSaveNotes}
          >
            <Save className="h-4 w-4" />
            {t("form.save")}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              disabled={!canCheckIn || isSubmitting}
              onClick={() => {
                void submitAction("check_in");
              }}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {t("actions.checkIn")}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer"
              disabled={!canCheckOut || isSubmitting}
              onClick={() => {
                void submitAction("check_out");
              }}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {t("actions.checkOut")}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="cursor-pointer"
              disabled={!canComplete || isSubmitting}
              onClick={() => {
                void submitAction("submit_visit");
              }}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {t("actions.complete")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}