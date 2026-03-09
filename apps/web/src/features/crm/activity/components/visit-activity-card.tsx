"use client";

import { useState, useCallback } from "react";
import { MapPin, LogOut, Loader2, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OutcomeBadge } from "./outcome-badge";
import { Link } from "@/i18n/routing";
import { formatCurrency, formatTime, resolveImageUrl } from "@/lib/utils";
import { useCheckOutVisitReport } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useVisitReportById, visitReportKeys } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useCheckInVisitReport } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useTranslations } from "next-intl";
import { activityKeys } from "../hooks/use-activities";
import type { VisitActivityMetadata } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useProduct } from "@/features/master-data/product/hooks/use-products";
import { ProductDetailDialog } from "@/features/master-data/product/components/product/product-detail-dialog";

const MAX_VISIBLE_PHOTOS = 5;

interface VisitActivityCardProps {
  readonly meta: VisitActivityMetadata;
  readonly visitReportId?: string | null;
}

/** Renders visit-specific details (photos, GPS, outcome, checkout) inside an activity timeline card. */
export function VisitActivityCard({ meta, visitReportId }: VisitActivityCardProps) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const qc = useQueryClient();
  const checkOutMutation = useCheckOutVisitReport();
  const checkInMutation = useCheckInVisitReport();
  const visitReportQuery = useVisitReportById(visitReportId ?? "");
  const t = useTranslations("crmVisitReport");
  const ta = useTranslations("crmActivity");
  const canViewProduct = useUserPermission("product.read");
  const selectedProductQuery = useProduct(selectedProductId ?? "", { enabled: !!selectedProductId });

  const handleCheckOut = useCallback(async () => {
    if (!visitReportId) return;
    setCheckingOut(true);
    try {
      let gps: { latitude: number; longitude: number; accuracy: number } | undefined;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            })
          );
          gps = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch {
          // GPS is optional — proceed without it
        }
      }
      await checkOutMutation.mutateAsync({ id: visitReportId, data: gps ?? {} });
      // ensure activity list and visit detail are refreshed
      qc.invalidateQueries({ queryKey: activityKeys.all });
      qc.refetchQueries({ queryKey: visitReportKeys.detail(visitReportId) });
      toast.success(t("checkedOut"));
    } catch {
      toast.error(t("locationError"));
    } finally {
      setCheckingOut(false);
    }
  }, [visitReportId, checkOutMutation, qc, t]);

  const handleCheckIn = useCallback(async () => {
    if (!visitReportId) return;
    setCheckingOut(true);
    try {
      let gps: { latitude: number; longitude: number; accuracy: number } | undefined;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            })
          );
          gps = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch {
          // GPS is optional
        }
      }
      await checkInMutation.mutateAsync({ id: visitReportId, data: gps ?? {} });
      qc.invalidateQueries({ queryKey: activityKeys.all });
      qc.refetchQueries({ queryKey: visitReportKeys.detail(visitReportId) });
      toast.success(t("checkedIn"));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const serverMsg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message;
      toast.error(serverMsg ?? t("locationError"));
    } finally {
      setCheckingOut(false);
    }
  }, [visitReportId, checkInMutation, qc, t]);

  // Prefer authoritative value from backend (visit report detail), fallback to activity metadata
  const visitReport = visitReportQuery?.data?.data;
  const hasCheckedOut = Boolean(visitReport?.check_out_at ?? meta.check_out_at);
  const hasCheckedIn = Boolean(visitReport?.check_in_at ?? meta.check_in_at);

  return (
    <div className="mt-1.5 space-y-2">
      {/* Check-in badge + checkout (button or badge) placed inline */}
      {hasCheckedIn ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {t("actions.checkIn")} {formatTime(visitReport?.check_in_at ?? meta.check_in_at)}
          </Badge>

          {hasCheckedOut ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <LogOut className="h-3 w-3" />
              {t("detail.checkedOutAt")} {formatTime(visitReport?.check_out_at ?? meta.check_out_at)}
            </Badge>
          ) : (
            // Show checkout button inline with badge when not yet checked out
            visitReportId && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-xs cursor-pointer"
                onClick={handleCheckOut}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                {checkingOut ? `${t("actions.checkOut") }...` : t("actions.checkOut")}
              </Button>
            )
          )}
        </div>
      ) : (
        // Not checked in yet — show Check In button if visit report exists
        visitReportId && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs cursor-pointer"
              onClick={handleCheckIn}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3 w-3" />
              )}
              {checkingOut ? `${t("actions.checkIn")}...` : t("actions.checkIn")}
            </Button>
          </div>
        )
      )}

      {/* Outcome badge */}
      {meta.outcome && <OutcomeBadge outcome={meta.outcome} />}

      {/* Photo gallery thumbnails — show up to 5 */}
      {meta.photos && meta.photos.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {meta.photos.slice(0, MAX_VISIBLE_PHOTOS).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={resolveImageUrl(url)}
              alt=""
              className="h-16 w-16 rounded object-cover border"
              loading="lazy"
            />
          ))}
          {meta.photos.length > MAX_VISIBLE_PHOTOS && (
            <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border">
              +{meta.photos.length - MAX_VISIBLE_PHOTOS}
            </div>
          )}
        </div>
      )}

      {/* duplicate checkout removed — actions are inline next to check-in */}

      {/* Product interest table */}
      {meta.products && meta.products.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Package className="h-3 w-3" />
            {ta("productInterest.title")}
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-2 py-1 text-left font-medium">{ta("productInterest.product")}</th>
                  <th className="px-2 py-1 text-center font-medium">{ta("productInterest.interest")}</th>
                  <th className="px-2 py-1 text-center font-medium">{ta("productInterest.qty")}</th>
                  <th className="px-2 py-1 text-right font-medium">{ta("productInterest.price")}</th>
                </tr>
              </thead>
              <tbody>
                {meta.products.map((p, idx) => (
                  <tr key={`${p.product_name}-${idx}`} className="border-t">
                    <td className="px-2 py-1">
                      {canViewProduct && p.product_id ? (
                        <button
                          type="button"
                          className="text-left hover:underline text-primary cursor-pointer"
                          onClick={() => setSelectedProductId(p.product_id ?? null)}
                        >
                          {p.product_name}
                        </button>
                      ) : (
                        <span>{p.product_name}</span>
                      )}
                      {p.product_sku && (
                        <span className="ml-1 text-muted-foreground">({p.product_sku})</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-amber-500 cursor-help select-none">
                            {"★".repeat(p.interest_level)}{"☆".repeat(Math.max(0, 5 - p.interest_level))}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px]">
                          <p className="font-medium mb-1">{p.interest_level}/5</p>
                          {p.notes && (
                            <p className="text-xs text-muted-foreground mb-1">{p.notes}</p>
                          )}
                          {p.survey_answers && p.survey_answers.length > 0 && (
                            <ul className="space-y-0.5 mt-1 border-t pt-1">
                              {p.survey_answers.map((sa, i) => (
                                <li key={i} className="text-xs">
                                  <span className="font-medium">{sa.question_text}:</span>{" "}
                                  <span className="text-muted-foreground">{sa.option_text}</span>
                                  {sa.score !== 0 && (
                                    <span className="ml-1 text-amber-500">({sa.score})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-2 py-1 text-center">{p.quantity ?? "-"}</td>
                    <td className="px-2 py-1 text-right">
                      {p.unit_price && p.unit_price > 0 ? formatCurrency(p.unit_price) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product detail dialog */}
      <ProductDetailDialog
        open={!!selectedProductId}
        onOpenChange={(open) => { if (!open) setSelectedProductId(null); }}
        product={selectedProductQuery.data?.data ?? null}
      />

      {/* Link to visit report detail */}
      {visitReportId && (
        <Link
          href={`/crm/visits/${visitReportId}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
        >
          {meta.visit_code ?? t("detail.visitCode")} &rarr;
        </Link>
      )}
    </div>
  );
}
