"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Calendar,
  User,
  Wrench,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  History,
  UserCheck,
  Users,
  Box,
} from "lucide-react";
import type { HRTicket, HRTicketPriority, HRTicketStatus } from "../types/hr-ticket.types";

interface HRTicketDetailModalProps {
  ticket: HRTicket | null;
  open: boolean;
  onClose: () => void;
  onAssignTech?: (ticket: HRTicket) => void;
  onUpdateStatus?: (ticket: HRTicket) => void;
}

function PriorityBadge({ priority }: { priority: HRTicketPriority }) {
  const t = useTranslations("hrSupport");
  const variantMap: Record<HRTicketPriority, "destructive" | "warning" | "active" | "secondary"> = {
    urgent: "destructive",
    high: "warning",
    medium: "active",
    low: "secondary",
  };

  return (
    <Badge variant={variantMap[priority]} className="text-xs uppercase font-bold px-2.5 py-0.5">
      {t(`priority.${priority}`)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: HRTicketStatus }) {
  const t = useTranslations("hrSupport");
  const variantMap: Record<HRTicketStatus, "success" | "warning" | "info" | "active" | "secondary" | "outline" | "destructive"> = {
    open: "warning",
    assigned: "info",
    in_progress: "active",
    pending_parts: "secondary",
    resolved: "success",
    closed: "outline",
    rejected: "destructive",
  };

  return (
    <Badge variant={variantMap[status]} className="text-xs uppercase font-bold px-2.5 py-0.5">
      {t(`status.${status}`)}
    </Badge>
  );
}

export function HRTicketDetailModal({
  ticket,
  open,
  onClose,
  onAssignTech,
  onUpdateStatus,
}: HRTicketDetailModalProps) {
  const t = useTranslations("hrSupport");

  if (!ticket) return null;

  const categoryLabel = t(`categories.${ticket.category}`);
  const assetPhoto = ticket.asset_photo || ticket.photos?.[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {ticket.ticket_number}
                </span>
                <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/20 px-2 py-0.5">
                  <Users className="h-3 w-3 mr-1" />
                  SDM & Aset
                </Badge>
                <span className="text-xs text-muted-foreground">{categoryLabel}</span>
              </div>
              <DialogTitle className="text-lg font-bold mt-1 text-foreground">
                {ticket.title}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>
        </DialogHeader>

        {/* Asset Highlight Box */}
        {ticket.asset_name && (
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4 my-1">
            {assetPhoto ? (
              <img
                src={assetPhoto}
                alt={ticket.asset_name}
                className="h-16 w-20 rounded-lg object-cover border shadow-sm shrink-0"
              />
            ) : (
              <div className="h-16 w-20 rounded-lg border bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
                <Box className="h-6 w-6" />
              </div>
            )}
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 border-emerald-500/20 px-2 py-0.5">
                {ticket.asset_code || "KODE ASET"}
              </Badge>
              <p className="font-bold text-foreground text-sm">{ticket.asset_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                {ticket.location}
              </p>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Dilaporkan pada: <strong className="text-foreground">{new Date(ticket.created_at).toLocaleString("id-ID")}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {onAssignTech && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssignTech(ticket)}
                className="cursor-pointer text-xs h-8 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                {t("dialogs.actions.assignTech")}
              </Button>
            )}

            {onUpdateStatus && (
              <Button
                size="sm"
                onClick={() => onUpdateStatus(ticket)}
                className="cursor-pointer text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {t("dialogs.actions.updateStatus")}
              </Button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-1">
          {/* Reporter Card */}
          <Card className="py-3.5">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-600" />
                {t("detail.reporterInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p className="font-bold text-foreground text-sm">{ticket.reporter.name}</p>
              <p className="text-muted-foreground">{ticket.reporter.code} &bull; {ticket.reporter.department}</p>
              {ticket.reporter.email && <p className="text-muted-foreground">{ticket.reporter.email}</p>}
            </CardContent>
          </Card>

          {/* Technician Card */}
          <Card className="py-3.5">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-emerald-600" />
                {t("detail.technicianInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {ticket.assigned_technician ? (
                <>
                  <p className="font-bold text-foreground text-sm">{ticket.assigned_technician.name}</p>
                  <p className="text-muted-foreground">{ticket.assigned_technician.role}</p>
                  {ticket.target_completion_date && (
                    <p className="text-emerald-700 font-medium pt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("detail.targetDateLabel")}: {ticket.target_completion_date}
                    </p>
                  )}
                </>
              ) : (
                <div className="py-3 text-center text-xs text-muted-foreground bg-muted/20 rounded border border-dashed">
                  {t("detail.unassigned")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Overview & Activity Timeline */}
        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
            <TabsTrigger value="overview" className="cursor-pointer text-xs rounded-t-md">
              {t("detail.overviewTab")}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="cursor-pointer text-xs rounded-t-md">
              <History className="h-3.5 w-3.5 mr-1" />
              {t("detail.activityTimeline")} ({ticket.activities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-3">
            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                {t("detail.reportedDescription")}
              </h4>
              <p className="text-xs text-foreground bg-muted/30 p-3 rounded-md border whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* Photos */}
            {ticket.photos.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                  {t("detail.photosIssue")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {ticket.photos.map((photoUrl, idx) => (
                    <a key={idx} href={photoUrl} target="_blank" rel="noreferrer" className="block cursor-pointer">
                      <img
                        src={photoUrl}
                        alt={`Bukti Aset ${idx + 1}`}
                        className="h-24 w-32 rounded-md object-cover border hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Notes */}
            {ticket.resolution_notes && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("detail.resolutionNotesHeader")}
                </h4>
                <p className="text-xs text-foreground">{ticket.resolution_notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="pt-3">
            <div className="space-y-3 relative pl-4 border-l border-border/60 ml-2 py-1">
              {ticket.activities.map((act) => (
                <div key={act.id} className="relative group">
                  <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-emerald-600 bg-background group-hover:bg-emerald-600 transition-colors" />
                  <Card className="py-3 text-xs shadow-sm">
                    <CardContent className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{act.action}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(act.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {t("detail.byActor")}: <span className="font-semibold text-foreground">{act.actor_name}</span> ({act.actor_role})
                      </p>
                      {act.notes && (
                        <p className="text-foreground bg-muted/40 p-2 rounded mt-1 text-[11px]">
                          {act.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-3 border-t flex justify-end">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            {t("dialogs.actions.closeDetail")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
