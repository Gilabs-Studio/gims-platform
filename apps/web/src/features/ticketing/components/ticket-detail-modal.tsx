"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketStatusBadge } from "./ticket-status-badge";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketWorkflowStepper } from "./ticket-workflow-stepper";
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
} from "lucide-react";
import type { Ticket } from "../types/ticketing.types";

interface TicketDetailModalProps {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
  onAssignTech?: (ticket: Ticket) => void;
  onUpdateStatus?: (ticket: Ticket) => void;
}

export function TicketDetailModal({
  ticket,
  open,
  onClose,
  onAssignTech,
  onUpdateStatus,
}: TicketDetailModalProps) {
  const t = useTranslations("ticketing");

  if (!ticket) return null;

  const categoryLabel = t(`categories.${ticket.category}`);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {ticket.ticket_number}
                </span>
                <span className="text-xs text-muted-foreground">{categoryLabel}</span>
              </div>
              <DialogTitle className="text-lg font-bold mt-1 text-foreground">
                {ticket.title}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
            </div>
          </div>
        </DialogHeader>

        {/* Visual Workflow Stepper UI */}
        <div className="py-2 bg-card rounded-lg border p-4 shadow-sm my-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wide">
            {t("stepper.headerTitle")}
          </p>
          <TicketWorkflowStepper status={ticket.status} />
        </div>

        {/* Actions Bar if management mode */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium text-foreground">{ticket.location}</span>
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
                className="cursor-pointer text-xs h-8 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {t("dialogs.actions.updateStatus")}
              </Button>
            )}
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          {/* Left Column: Reporter Card */}
          <div className="rounded-lg border p-3.5 space-y-2 bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              {t("detail.reporterInfo")}
            </h4>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-foreground text-sm">{ticket.reporter.name}</p>
              <p className="text-muted-foreground">{ticket.reporter.code} &bull; {ticket.reporter.department}</p>
              {ticket.reporter.email && <p className="text-muted-foreground">{ticket.reporter.email}</p>}
              <p className="text-foreground font-medium pt-1">{t("detail.locationLabel")}: {ticket.reporter.location}</p>
            </div>
          </div>

          {/* Right Column: Assigned Technician Card */}
          <div className="rounded-lg border p-3.5 space-y-2 bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              {t("detail.technicianInfo")}
            </h4>
            {ticket.assigned_technician ? (
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground text-sm">{ticket.assigned_technician.name}</p>
                <p className="text-muted-foreground">{ticket.assigned_technician.role}</p>
                <p className="text-muted-foreground">{ticket.assigned_technician.department}</p>
                {ticket.target_completion_date && (
                  <p className="text-primary font-medium pt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t("detail.targetDateLabel")}: {ticket.target_completion_date}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-muted-foreground bg-muted/20 rounded border border-dashed">
                {t("detail.unassigned")}
                <p className="text-[10px] mt-0.5">{t("detail.teamLabel")}: {ticket.assigned_team || "-"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs: Overview & Photos / Timeline Activity */}
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

            {/* Reported Photos */}
            {ticket.photos.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  {t("detail.photosIssue")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {ticket.photos.map((photoUrl, idx) => (
                    <a key={idx} href={photoUrl} target="_blank" rel="noreferrer" className="block cursor-pointer">
                      <img
                        src={photoUrl}
                        alt={`Bukti ${idx + 1}`}
                        className="h-24 w-32 rounded-md object-cover border hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Notes & Photos if available */}
            {ticket.resolution_notes && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("detail.resolutionNotesHeader")}
                </h4>
                <p className="text-xs text-foreground">{ticket.resolution_notes}</p>

                {ticket.resolution_photos && ticket.resolution_photos.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] text-muted-foreground font-medium mb-1">{t("detail.resolutionPhotosLabel")}:</p>
                    <div className="flex gap-2">
                      {ticket.resolution_photos.map((pUrl, i) => (
                        <img
                          key={i}
                          src={pUrl}
                          alt="Hasil Perbaikan"
                          className="h-20 w-28 rounded object-cover border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="pt-3">
            <div className="space-y-3 relative pl-4 border-l border-border/60 ml-2 py-1">
              {ticket.activities.map((act) => (
                <div key={act.id} className="relative group">
                  <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background group-hover:bg-primary transition-colors" />
                  <div className="rounded-md border bg-card p-3 space-y-1 text-xs">
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
                  </div>
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
