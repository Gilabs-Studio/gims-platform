"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, MapPin, Navigation, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  distance_m?: number;
  product_interests?: VisitProductInterestInput[];
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

  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [activityType, setActivityType] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productInterestLevel, setProductInterestLevel] = useState("3");
  const [productQuantity, setProductQuantity] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productNotes, setProductNotes] = useState("");

  const status = checkpoint?.status ?? "pending";
  const isSelectable = checkpoint?.can_select ?? false;
  const hasCoordinates =
    typeof checkpoint?.latitude === "number" && typeof checkpoint?.longitude === "number";

  const canCheckIn = canSubmit && isSelectable && hasCoordinates && status === "pending";
  const canCheckOut =
    canSubmit
    && isSelectable
    && hasCoordinates
    && (status === "checked_in" || status === "in_progress");
  const canComplete =
    canSubmit
    && isSelectable
    && hasCoordinates
    && (status === "checked_out" || status === "completed");

  const checkpointSummary = useMemo(() => {
    if (!checkpoint) {
      return [];
    }

    return [
      checkpoint.lead_id ? { key: "lead", value: checkpoint.lead_id } : null,
      checkpoint.deal_id ? { key: "deal", value: checkpoint.deal_id } : null,
      checkpoint.customer_id ? { key: "customer", value: checkpoint.customer_id } : null,
    ].filter((item): item is { key: string; value: string } => item !== null);
  }, [checkpoint]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

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
        if (uploadedUrl) {
          uploaded.push(uploadedUrl);
        }
      } catch {
        toast.error(tCommon("error"));
      }
    }

    if (uploaded.length > 0) {
      setPhotoUrls((prev) => [...prev, ...uploaded]);
      toast.success(t("form.photos.uploaded"));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submitAction = async (event: VisitEvent) => {
    if (!checkpoint) {
      return;
    }

    const parsedDistance = Number(distanceMeters);

    await onSubmitAction({
      event,
      notes: notes.trim() || undefined,
      outcome: outcome || undefined,
      activity_type: activityType || undefined,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      distance_m: Number.isFinite(parsedDistance) && parsedDistance >= 0 ? parsedDistance : undefined,
      product_interests:
        selectedProductId.trim().length > 0
          ? [
              {
                product_id: selectedProductId,
                interest_level: Number(productInterestLevel),
                notes: productNotes.trim() || undefined,
                quantity:
                  productQuantity.trim().length > 0 && Number.isFinite(Number(productQuantity))
                    ? Number(productQuantity)
                    : undefined,
                price:
                  productPrice.trim().length > 0 && Number.isFinite(Number(productPrice))
                    ? Number(productPrice)
                    : undefined,
              },
            ]
          : undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{t("panel.detailsTitle")}</CardTitle>
          <Badge variant="outline">{t(toStatusLabelKey(status))}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("panel.detailsDescription")}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!route || !checkpoint ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {t("state.selectCheckpoint")}
          </div>
        ) : (
          <>
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{checkpoint.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("sidebar.sequence", { value: checkpoint.sequence })}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                {checkpointSummary.map((item) => (
                  <p key={item.key} className="text-xs text-muted-foreground">
                    {t(`panel.ref.${item.key}`)}: {item.value}
                  </p>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {hasCoordinates
                  ? `${checkpoint.latitude?.toFixed(5) ?? "-"}, ${checkpoint.longitude?.toFixed(5) ?? "-"}`
                  : t("panel.locationMissing")}
              </p>
              {!isSelectable && checkpoint.missing_location_reason ? (
                <p className="mt-2 text-xs text-destructive">{checkpoint.missing_location_reason}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit-notes">{t("form.notes")}</Label>
              <Textarea
                id="visit-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("form.notesPlaceholder")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
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

              <div className="space-y-2">
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
              <Label htmlFor="visit-distance">{t("form.distance")}</Label>
              <Input
                id="visit-distance"
                type="number"
                min={0}
                step={1}
                value={distanceMeters}
                onChange={(event) => setDistanceMeters(event.target.value)}
                placeholder={t("form.distancePlaceholder")}
              />
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="visit-product">Product interest</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger id="visit-product" className="cursor-pointer">
                      <SelectValue placeholder="Select product for this visit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id} className="cursor-pointer">
                          {product.code} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visit-product-interest">Interest level (0-5)</Label>
                  <Input
                    id="visit-product-interest"
                    type="number"
                    min={0}
                    max={5}
                    value={productInterestLevel}
                    onChange={(event) => setProductInterestLevel(event.target.value)}
                    placeholder="3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visit-product-qty">Estimated quantity</Label>
                  <Input
                    id="visit-product-qty"
                    type="number"
                    min={0}
                    value={productQuantity}
                    onChange={(event) => setProductQuantity(event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visit-product-price">Expected price</Label>
                  <Input
                    id="visit-product-price"
                    type="number"
                    min={0}
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="visit-product-notes">Product notes</Label>
                  <Textarea
                    id="visit-product-notes"
                    value={productNotes}
                    onChange={(event) => setProductNotes(event.target.value)}
                    placeholder="Product-specific discussion notes"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
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
                onChange={(event) => {
                  void handleUploadFiles(event.target.files);
                }}
              />

              {photoUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
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
                        className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-muted-foreground transition hover:text-foreground cursor-pointer"
                        onClick={() => {
                          setPhotoUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
                        }}
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

            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
