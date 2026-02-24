"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  User,
  Package,
  FileText,
  ArrowRightLeft,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DealHistoryTimeline } from "./deal-history-timeline";
import type { Deal } from "../types";

interface DealDetailModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onMoveStage: (deal: Deal) => void;
  isDeleting?: boolean;
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "won":
      return "default";
    case "lost":
      return "destructive";
    default:
      return "secondary";
  }
}

export function DealDetailModal({
  deal,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onMoveStage,
  isDeleting,
}: DealDetailModalProps) {
  const t = useTranslations("crmDeal");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!deal) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg">{deal.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {deal.code}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={getStatusVariant(deal.status)}>
                  {deal.status.toUpperCase()}
                </Badge>
                {deal.status === "open" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => onMoveStage(deal)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-1" />
                      {t("moveStage")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => onEdit(deal)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {t("edit")}
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Left column: Deal info */}
            <div className="md:col-span-2 space-y-5">
              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{t("value")}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(deal.value)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("probability")}
                  </p>
                  <p className="text-lg font-semibold">{deal.probability}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("pipelineStage")}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {deal.pipeline_stage && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            deal.pipeline_stage.color || "#6b7280",
                        }}
                      />
                    )}
                    <span className="text-sm font-medium">
                      {deal.pipeline_stage?.name ?? "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {deal.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("description")}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {deal.description}
                  </p>
                </div>
              )}

              <Separator />

              {/* Tabs: Product Items / History */}
              <Tabs defaultValue="items">
                <TabsList>
                  <TabsTrigger value="items" className="cursor-pointer">
                    <Package className="h-4 w-4 mr-1" />
                    {t("productItems")} ({deal.items?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-1" />
                    {t("history")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-3">
                  {!deal.items || deal.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {t("noItems")}
                    </p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">
                              {t("product")}
                            </th>
                            <th className="text-right p-2 font-medium">
                              {t("unitPrice")}
                            </th>
                            <th className="text-right p-2 font-medium">
                              {t("qty")}
                            </th>
                            <th className="text-right p-2 font-medium">
                              {t("discountPct")}
                            </th>
                            <th className="text-right p-2 font-medium">
                              {t("subtotal")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {deal.items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2">
                                <p className="font-medium">
                                  {item.product_name}
                                </p>
                                {item.product_sku && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.product_sku}
                                  </p>
                                )}
                              </td>
                              <td className="text-right p-2">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="text-right p-2">
                                {item.quantity}
                              </td>
                              <td className="text-right p-2">
                                {item.discount_percent > 0
                                  ? `${item.discount_percent}%`
                                  : "-"}
                              </td>
                              <td className="text-right p-2 font-medium">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t bg-muted/30">
                            <td
                              colSpan={4}
                              className="text-right p-2 font-semibold"
                            >
                              {t("total")}
                            </td>
                            <td className="text-right p-2 font-semibold">
                              {formatCurrency(deal.value)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-3">
                  <DealHistoryTimeline dealId={deal.id} />
                </TabsContent>
              </Tabs>

              {/* Notes */}
              {deal.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">{t("notes")}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {deal.notes}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right column: Related info */}
            <div className="space-y-4">
              {/* Customer */}
              {deal.customer && (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("customer")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {deal.customer.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {deal.customer.code}
                  </p>
                </div>
              )}

              {/* Contact */}
              {deal.contact && (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("contact")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {deal.contact.name}
                    </span>
                  </div>
                  {deal.contact.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {deal.contact.phone}
                    </div>
                  )}
                  {deal.contact.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {deal.contact.email}
                    </div>
                  )}
                </div>
              )}

              {/* Assigned */}
              {deal.assigned_employee && (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("assignedTo")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {deal.assigned_employee.name.charAt(0)}
                    </div>
                    <span className="text-sm">{deal.assigned_employee.name}</span>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("dates")}
                </h4>
                {deal.expected_close_date && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{t("expectedClose")}:</span>
                    <span className="font-medium">
                      {formatDate(deal.expected_close_date)}
                    </span>
                  </div>
                )}
                {deal.actual_close_date && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{t("actualClose")}:</span>
                    <span className="font-medium">
                      {formatDate(deal.actual_close_date)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{t("createdAt")}:</span>
                  <span className="font-medium">
                    {formatDate(deal.created_at)}
                  </span>
                </div>
              </div>

              {/* BANT */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("bantTitle")}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.budget_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>{t("budget")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.auth_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>{t("authority")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.need_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>{t("need")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.time_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>{t("timeline")}</span>
                  </div>
                </div>
                {deal.budget_amount > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <DollarSign className="h-3 w-3" />
                    <span>{formatCurrency(deal.budget_amount)}</span>
                  </div>
                )}
              </div>

              {/* Lead */}
              {deal.lead && (
                <div className="rounded-lg border p-3 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("lead")}
                  </h4>
                  <p className="text-sm font-medium">
                    {deal.lead.first_name} {deal.lead.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {deal.lead.code}
                  </p>
                </div>
              )}

              {/* Close reason */}
              {deal.close_reason && (
                <div className="rounded-lg border p-3 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("closeReason")}
                  </h4>
                  <p className="text-sm">{deal.close_reason}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDealTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDealDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(deal.id);
                setShowDeleteDialog(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
