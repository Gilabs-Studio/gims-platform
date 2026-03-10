"use client";

import { Clock, User, Building, Contact, Handshake, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Activity } from "../types";
import { VisitActivityCard } from "./visit-activity-card";
import { parseVisitMetadata } from "../utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityDetailDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly activity: Activity;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function ActivityDetailDialog({
  open,
  onClose,
  activity,
}: ActivityDetailDialogProps) {
  const t = useTranslations("crmActivity");

  const isVisit = activity.type === "visit";
  const visitMeta = isVisit ? parseVisitMetadata(activity.metadata) : null;

  // For non-visit activities, parse metadata products directly
  const activityMeta = !isVisit ? parseVisitMetadata(activity.metadata) : null;
  const metaProducts = activityMeta?.products ?? [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{t("detailTitle")}</DialogTitle>
            <Badge variant="secondary">{t(`types.${activity.type}` as Parameters<typeof t>[0])}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">{t("table.description")}</p>
            <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
          </div>

          {/* Visit-specific metadata (checkin, photos, outcome, products) */}
          {isVisit && visitMeta && (
            <div className="rounded-lg border p-4">
              <VisitActivityCard meta={visitMeta} visitReportId={activity.visit_report_id} />
            </div>
          )}

          {/* Product table for non-visit activities that have metadata products */}
          {!isVisit && metaProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                {t("productInterest.title")}
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-2 py-1.5 text-left font-medium">{t("productInterest.product")}</th>
                      <th className="px-2 py-1.5 text-center font-medium">{t("productInterest.interest")}</th>
                      <th className="px-2 py-1.5 text-center font-medium">{t("productInterest.qty")}</th>
                      <th className="px-2 py-1.5 text-right font-medium">{t("productInterest.price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metaProducts.map((p, idx) => (
                      <tr key={`${p.product_name}-${idx}`} className="border-t">
                        <td className="px-2 py-1.5">
                          <span>{p.product_name}</span>
                          {p.product_sku && (
                            <span className="ml-1 text-muted-foreground">({p.product_sku})</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-amber-500 cursor-help select-none">
                                {"★".repeat(p.interest_level)}{"☆".repeat(Math.max(0, 5 - p.interest_level))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[260px] p-2">
                              <div className="space-y-1">
                                <p className="font-semibold text-xs">{t("productInterest.interestSurvey")} · {p.interest_level}/5</p>
                                {p.notes && (
                                  <p className="text-xs text-muted-foreground italic border-t pt-1">{p.notes}</p>
                                )}
                                {p.survey_answers && p.survey_answers.length > 0 && (
                                  <ul className="space-y-1 border-t pt-1">
                                    {p.survey_answers.map((sa, i) => (
                                      <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-x-2 items-start">
                                        <span className="text-muted-foreground">{sa.question_text}</span>
                                        <span className="font-medium text-right whitespace-nowrap">
                                          {sa.option_text}
                                          {sa.score !== 0 && (
                                            <span className="ml-1 text-amber-500">({sa.score})</span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="px-2 py-1.5 text-center">{p.quantity ?? "-"}</td>
                        <td className="px-2 py-1.5 text-right">
                          {p.unit_price && p.unit_price > 0 ? formatCurrency(p.unit_price) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-1 divide-y">
            <InfoRow icon={User} label={t("table.employee")} value={activity.employee?.name} />
            <InfoRow icon={Building} label={t("table.customer")} value={activity.customer?.name} />
            <InfoRow icon={Contact} label={t("table.contact")} value={activity.contact?.name} />
            <InfoRow icon={Handshake} label={t("table.deal")} value={activity.deal?.title} />
            <InfoRow
              icon={Clock}
              label={t("table.timestamp")}
              value={activity.timestamp ? formatDate(activity.timestamp) : null}
            />
            <InfoRow
              icon={Clock}
              label={t("table.createdAt")}
              value={formatDate(activity.created_at)}
            />
          </div>

          {/* Activity Type info */}
          {activity.activity_type && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-1">{t("form.activityType")}</p>
              <p className="text-sm font-medium">{activity.activity_type.name}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
