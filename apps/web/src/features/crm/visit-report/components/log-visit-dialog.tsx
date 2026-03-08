"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Loader2, Camera, X, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useCreateVisitReport } from "../hooks/use-visit-reports";
import { visitReportService } from "../services/visit-report-service";
import { activityKeys } from "@/features/crm/activity/hooks/use-activities";
import { toast } from "sonner";
import type { CreateVisitReportData, VisitReportOutcome } from "../types";

const OUTCOME_OPTIONS: VisitReportOutcome[] = ["very_positive", "positive", "neutral", "negative"];
const MAX_PHOTOS = 5;

interface LogVisitDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly leadId?: string;
  readonly dealId?: string;
  readonly customerId?: string;
  readonly contactId?: string;
  readonly defaultEmployeeId?: string;
  readonly onSuccess?: () => void;
}

interface GpsState {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function LogVisitDialog({
  open,
  onClose,
  leadId,
  dealId,
  customerId,
  contactId,
  defaultEmployeeId,
  onSuccess,
}: LogVisitDialogProps) {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const createMutation = useCreateVisitReport();

  // Form state
  const [purpose, setPurpose] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [result, setResult] = useState("");
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // GPS state
  const [checkInGps, setCheckInGps] = useState<GpsState | null>(null);
  const [checkOutGps, setCheckOutGps] = useState<GpsState | null>(null);
  const [capturingGps, setCapturingGps] = useState<"in" | "out" | null>(null);

  const resetForm = useCallback(() => {
    setPurpose("");
    setContactPerson("");
    setContactPhone("");
    setResult("");
    setOutcome("");
    setNotes("");
    setPhotos([]);
    setCheckInGps(null);
    setCheckOutGps(null);
    setCapturingGps(null);
    setUploadingPhoto(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const captureGps = useCallback(async (type: "in" | "out") => {
    if (!navigator.geolocation) {
      toast.error(t("locationError"));
      return;
    }

    setCapturingGps(type);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const gps: GpsState = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      if (type === "in") {
        setCheckInGps(gps);
        toast.success(t("locationCaptured"));
      } else {
        setCheckOutGps(gps);
        toast.success(t("locationCaptured"));
      }
    } catch {
      toast.error(t("locationError"));
    } finally {
      setCapturingGps(null);
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
      // Reset input value so the same file can be uploaded again
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

    const today = new Date().toISOString().split("T")[0];
    const payload: CreateVisitReportData = {
      visit_date: today,
      employee_id: defaultEmployeeId ?? "",
      lead_id: leadId ?? null,
      deal_id: dealId ?? null,
      customer_id: customerId ?? null,
      contact_id: contactId ?? null,
      purpose: purpose.trim(),
      contact_person: contactPerson.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
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

      // Check-out with result/outcome if provided
      if (checkOutGps || result.trim() || outcome) {
        await visitReportService.checkOut(visitId, {
          latitude: checkOutGps?.latitude,
          longitude: checkOutGps?.longitude,
          accuracy: checkOutGps?.accuracy,
          result: result.trim() || undefined,
          outcome: outcome || undefined,
        });
      }

      // Submit the visit report
      await visitReportService.submit(visitId);

      // Invalidate activity queries to refresh timelines
      qc.invalidateQueries({ queryKey: activityKeys.all });

      toast.success(t("created"));
      handleClose();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  }, [
    purpose, defaultEmployeeId, leadId, dealId, customerId, contactId,
    contactPerson, contactPhone, notes, checkInGps, checkOutGps,
    photos, result, outcome, createMutation, handleClose, onSuccess,
    qc, t, tCommon,
  ]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("logVisit")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {/* Contact Person */}
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

          {/* GPS Check-in */}
          <div className="space-y-1.5">
            <Label>{t("actions.checkIn")}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={checkInGps ? "secondary" : "outline"}
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => captureGps("in")}
                disabled={capturingGps === "in"}
              >
                {capturingGps === "in" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : checkInGps ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                {capturingGps === "in" ? t("capturingLocation") : t("actions.checkIn")}
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
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
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

          {/* Result */}
          <div className="space-y-1.5">
            <Label>{t("form.result")}</Label>
            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder={t("form.resultPlaceholder")}
              rows={2}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <Label>{t("form.outcome")}</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.outcomePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o} className="cursor-pointer">
                    {t(`outcome.${o}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GPS Check-out */}
          <div className="space-y-1.5">
            <Label>{t("actions.checkOut")}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={checkOutGps ? "secondary" : "outline"}
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => captureGps("out")}
                disabled={capturingGps === "out"}
              >
                {capturingGps === "out" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : checkOutGps ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                {capturingGps === "out" ? t("capturingLocation") : t("actions.checkOut")}
              </Button>
              {checkOutGps && (
                <Badge variant="outline" className="text-xs">
                  {checkOutGps.latitude.toFixed(5)}, {checkOutGps.longitude.toFixed(5)}
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t("form.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("form.notesPlaceholder")}
              rows={2}
            />
          </div>
        </div>

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
