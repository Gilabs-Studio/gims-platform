"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Wrench,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  History,
  UserCheck,
  Monitor,
} from "lucide-react";
import { itTicketService } from "../services/it-ticket.service";
import { ITTicketAssignDialog } from "./it-ticket-assign-dialog";
import { ITTicketStatusDialog } from "./it-ticket-status-dialog";
import type { ITTicket, ITTicketStatus, ITTicketPriority } from "../types/it-ticket.types";
import type { AssignITTechnicianFormValues, UpdateITTicketStatusFormValues } from "../schemas/it-ticket.schema";

interface ITTicketDetailPageProps {
  ticketId: string;
}

function PriorityBadge({ priority }: { priority: ITTicketPriority }) {
  const t = useTranslations("itSupport");
  const variantMap: Record<ITTicketPriority, "destructive" | "warning" | "active" | "secondary"> = {
    urgent: "destructive",
    high: "warning",
    medium: "active",
    low: "secondary",
  };

  return (
    <Badge variant={variantMap[priority]} className="text-xs uppercase font-bold px-2.5 py-1">
      {t(`priority.${priority}`)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ITTicketStatus }) {
  const t = useTranslations("itSupport");
  const variantMap: Record<ITTicketStatus, "success" | "warning" | "info" | "active" | "secondary" | "outline"> = {
    open: "warning",
    assigned: "info",
    in_progress: "active",
    pending_parts: "secondary",
    resolved: "success",
    closed: "outline",
  };

  return (
    <Badge variant={variantMap[status]} className="text-xs uppercase font-bold px-2.5 py-1">
      {t(`status.${status}`)}
    </Badge>
  );
}

export function ITTicketDetailPage({ ticketId }: ITTicketDetailPageProps) {
  const t = useTranslations("itSupport");

  const [ticket, setTicket] = useState<ITTicket | undefined>(() =>
    itTicketService.getTicketById(ticketId)
  );

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  if (!ticket) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">Tiket IT dengan ID tersebut tidak ditemukan.</p>
        <Link href="/ticketing">
          <Button variant="outline" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("dialogs.actions.backToBoard")}
          </Button>
        </Link>
      </div>
    );
  }

  const technicians = itTicketService.getTechnicians();

  const handleAssignSubmit = (id: string, data: AssignITTechnicianFormValues) => {
    const updated = itTicketService.assignTechnician(id, data);
    if (updated) setTicket({ ...updated });
  };

  const handleStatusSubmit = (id: string, data: UpdateITTicketStatusFormValues) => {
    const updated = itTicketService.updateTicketStatus(id, data);
    if (updated) setTicket({ ...updated });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/ticketing">
          <Button variant="ghost" size="sm" className="cursor-pointer hover:bg-muted">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("dialogs.actions.backToBoard")}
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignOpen(true)}
            className="cursor-pointer text-xs h-9 hover:-translate-y-0.5 transition-all duration-300"
          >
            <UserCheck className="h-4 w-4 mr-1.5" />
            {t("dialogs.actions.assignTech")}
          </Button>
          <Button
            size="sm"
            onClick={() => setIsStatusOpen(true)}
            className="cursor-pointer text-xs h-9 hover:-translate-y-0.5 transition-all duration-300"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {t("dialogs.actions.updateStatus")}
          </Button>
        </div>
      </div>

      {/* Main Ticket Banner Header */}
      <Card className="py-6 space-y-4">
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                  {ticket.ticket_number}
                </span>
                <Badge variant="outline" className="text-xs font-medium">
                  {t(`categories.${ticket.category}`)}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight pt-1">
                {ticket.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          {/* Location & Team Meta */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">{ticket.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Monitor className="h-4 w-4 text-primary shrink-0" />
              <span>Tim: <strong className="text-foreground">{ticket.assigned_team || "Tim IT Support"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span>Dibuat: {new Date(ticket.created_at).toLocaleString("id-ID")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reporter & Technician Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reporter Card */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-wide">
              <User className="h-4 w-4 text-primary" />
              {t("detail.reporterInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-bold text-foreground text-sm">{ticket.reporter.name}</p>
            <p className="text-muted-foreground">{ticket.reporter.code} &bull; {ticket.reporter.department}</p>
            {ticket.reporter.email && <p className="text-muted-foreground">{ticket.reporter.email}</p>}
            <p className="text-foreground font-medium pt-1">Lokasi Kerja: {ticket.reporter.location}</p>
          </CardContent>
        </Card>

        {/* Technician Card */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-wide">
              <Wrench className="h-4 w-4 text-primary" />
              {t("detail.technicianInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {ticket.assigned_technician ? (
              <>
                <p className="font-bold text-foreground text-sm">{ticket.assigned_technician.name}</p>
                <p className="text-muted-foreground">{ticket.assigned_technician.role}</p>
                <p className="text-muted-foreground">{ticket.assigned_technician.department}</p>
                {ticket.target_completion_date && (
                  <p className="text-primary font-semibold pt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("detail.targetDateLabel")}: {ticket.target_completion_date}
                  </p>
                )}
              </>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                {t("detail.unassigned")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Overview vs Activity History */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
          <TabsTrigger value="overview" className="cursor-pointer text-xs rounded-t-md">
            {t("detail.overviewTab")}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="cursor-pointer text-xs rounded-t-md">
            <History className="h-3.5 w-3.5 mr-1" />
            {t("detail.activityTimeline")} ({ticket.activities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-2">
          {/* Issue Description */}
          <Card className="py-5 space-y-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {t("detail.reportedDescription")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground bg-muted/30 p-4 rounded-lg border whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          {/* Issue Evidence Photos */}
          {ticket.photos.length > 0 && (
            <Card className="py-5 space-y-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  {t("detail.photosIssue")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {ticket.photos.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block cursor-pointer">
                      <img
                        src={url}
                        alt={`Bukti Kendala ${idx + 1}`}
                        className="h-32 w-44 rounded-lg object-cover border hover:opacity-90 transition-opacity shadow-sm"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolution Summary */}
          {ticket.resolution_notes && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {t("detail.resolutionNotesHeader")}
              </h3>
              <p className="text-sm text-foreground leading-relaxed">{ticket.resolution_notes}</p>

              {ticket.resolution_photos && ticket.resolution_photos.length > 0 && (
                <div className="pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("detail.resolutionPhotosLabel")}:</p>
                  <div className="flex gap-3">
                    {ticket.resolution_photos.map((pUrl, i) => (
                      <img
                        key={i}
                        src={pUrl}
                        alt="Hasil Perbaikan IT"
                        className="h-24 w-36 rounded-lg object-cover border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="pt-2">
          <div className="space-y-4 relative pl-6 border-l-2 border-primary/30 ml-3 py-2">
            {ticket.activities.map((act) => (
              <div key={act.id} className="relative group">
                <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background group-hover:bg-primary transition-colors" />
                <Card className="py-4 space-y-1.5 text-xs shadow-sm">
                  <CardContent className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{act.action}</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(act.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {t("detail.byActor")}: <span className="font-semibold text-foreground">{act.actor_name}</span> ({act.actor_role})
                    </p>
                    {act.notes && (
                      <p className="text-foreground bg-muted/40 p-3 rounded-lg mt-2 text-xs leading-relaxed">
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

      {/* Modals */}
      <ITTicketAssignDialog
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        ticket={ticket}
        technicians={technicians}
        onSubmit={handleAssignSubmit}
      />

      <ITTicketStatusDialog
        open={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        ticket={ticket}
        onSubmit={handleStatusSubmit}
      />
    </div>
  );
}
