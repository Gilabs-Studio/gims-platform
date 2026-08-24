"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Search,
  Plus,
  Monitor,
  CheckCircle2,
  Clock,
  Wrench,
  Package,
  CheckSquare,
} from "lucide-react";
import { useITTickets } from "../hooks/use-it-tickets";
import { ITTicketCard } from "./it-ticket-card";
import { ITTicketCreateDialog } from "./it-ticket-create-dialog";
import type { ITTicket, ITTicketStatus, ITTicketCategory, ITTicketPriority } from "../types/it-ticket.types";
import type { AssignITTechnicianFormValues, UpdateITTicketStatusFormValues } from "../schemas/it-ticket.schema";
import { ITTicketAssignDialog } from "./it-ticket-assign-dialog";
import { ITTicketStatusDialog } from "./it-ticket-status-dialog";

const KANBAN_COLUMNS: { id: ITTicketStatus; labelKey: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "open", labelKey: "status.open", colorClass: "bg-amber-500", icon: Clock },
  { id: "assigned", labelKey: "status.assigned", colorClass: "bg-blue-500", icon: Monitor },
  { id: "in_progress", labelKey: "status.in_progress", colorClass: "bg-indigo-500", icon: Wrench },
  { id: "pending_parts", labelKey: "status.pending_parts", colorClass: "bg-purple-500", icon: Package },
  { id: "resolved", labelKey: "status.resolved", colorClass: "bg-emerald-500", icon: CheckCircle2 },
  { id: "closed", labelKey: "status.closed", colorClass: "bg-slate-500", icon: CheckSquare },
];

function DraggableITTicketCard({ ticket, onClick }: { ticket: ITTicket; onClick: (ticket: ITTicket) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
      }}
    >
      <ITTicketCard ticket={ticket} onClick={onClick} />
    </div>
  );
}

function DroppableColumn({ status, children }: { status: ITTicketStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-2 space-y-2.5 min-h-[420px] max-h-[calc(100vh-280px)] rounded-lg transition-colors ${
        isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function ITTicketKanban() {
  const t = useTranslations("itSupport");
  const router = useRouter();

  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    ticketsByStatus,
    statistics,
    technicians,
    handleCreateTicket,
    handleAssignTechnician,
    handleUpdateStatus,
    handleDeleteTicket,
  } = useITTickets();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<ITTicket | null>(null);
  const [selectedTicketForStatus, setSelectedTicketForStatus] = useState<ITTicket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const [activeTicket, setActiveTicket] = useState<ITTicket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as ITTicket | undefined;
    if (ticket) setActiveTicket(ticket);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTicket(null);
      const { active, over } = event;
      if (!over) return;

      const ticket = active.data.current?.ticket as ITTicket | undefined;
      const targetStatus = over.id as ITTicketStatus;
      if (!ticket) return;

      if (ticket.status === targetStatus) return;

      // Open status update dialog with target status pre-selected
      setSelectedTicketForStatus({
        ...ticket,
        status: targetStatus,
      });
    },
    []
  );

  const handleCardClick = (ticket: ITTicket) => {
    router.push(`/ticketing/${ticket.id}`);
  };

  const handleAssignSubmit = (id: string, data: AssignITTechnicianFormValues) => {
    handleAssignTechnician(id, data);
  };

  const handleStatusSubmit = (id: string, data: UpdateITTicketStatusFormValues) => {
    handleUpdateStatus(id, data);
  };

  return (
    <div className="space-y-6">
      {/* Title & Primary CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("createButton")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="py-3 transition-all hover:shadow-md">
          <CardContent className="px-3">
            <span className="text-xs text-muted-foreground font-medium">{t("stats.total")}</span>
            <div className="mt-1 text-xl font-bold text-foreground">{statistics.total}</div>
          </CardContent>
        </Card>

        <Card className="py-3 transition-all hover:shadow-md">
          <CardContent className="px-3">
            <span className="text-xs text-muted-foreground font-medium">{t("stats.open")}</span>
            <div className="mt-1 text-xl font-bold text-amber-500">{statistics.open}</div>
          </CardContent>
        </Card>

        <Card className="py-3 transition-all hover:shadow-md">
          <CardContent className="px-3">
            <span className="text-xs text-muted-foreground font-medium">{t("stats.inProgress")}</span>
            <div className="mt-1 text-xl font-bold text-primary">{statistics.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="py-3 transition-all hover:shadow-md">
          <CardContent className="px-3">
            <span className="text-xs text-muted-foreground font-medium">{t("stats.pendingParts")}</span>
            <div className="mt-1 text-xl font-bold text-purple-500">{statistics.pending_parts}</div>
          </CardContent>
        </Card>

        <Card className="py-3 transition-all hover:shadow-md">
          <CardContent className="px-3">
            <span className="text-xs text-muted-foreground font-medium">{t("stats.resolved")}</span>
            <div className="mt-1 text-xl font-bold text-emerald-600">{statistics.resolved}</div>
          </CardContent>
        </Card>

        <Card className="py-3 transition-all hover:shadow-md">
          <CardContent className="px-3">
            <span className="text-xs text-muted-foreground font-medium">{t("stats.urgent")}</span>
            <div className="mt-1 text-xl font-bold text-rose-600">{statistics.urgent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar (Containerless) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onValueChange={(val) => setCategoryFilter(val as ITTicketCategory | "all")}
        >
          <SelectTrigger className="w-[170px] cursor-pointer">
            <SelectValue placeholder={t("filters.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("filters.allCategories")}</SelectItem>
            <SelectItem value="it_hardware" className="cursor-pointer">{t("categories.it_hardware")}</SelectItem>
            <SelectItem value="it_software" className="cursor-pointer">{t("categories.it_software")}</SelectItem>
            <SelectItem value="it_network" className="cursor-pointer">{t("categories.it_network")}</SelectItem>
            <SelectItem value="it_account" className="cursor-pointer">{t("categories.it_account")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={priorityFilter}
          onValueChange={(val) => setPriorityFilter(val as ITTicketPriority | "all")}
        >
          <SelectTrigger className="w-[150px] cursor-pointer">
            <SelectValue placeholder={t("filters.allPriorities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("filters.allPriorities")}</SelectItem>
            <SelectItem value="low" className="cursor-pointer">{t("priority.low")}</SelectItem>
            <SelectItem value="medium" className="cursor-pointer">{t("priority.medium")}</SelectItem>
            <SelectItem value="high" className="cursor-pointer text-amber-600 font-semibold">{t("priority.high")}</SelectItem>
            <SelectItem value="urgent" className="cursor-pointer text-rose-600 font-bold">{t("priority.urgent")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board Container */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
          {KANBAN_COLUMNS.map((col) => {
            const list = ticketsByStatus[col.id] || [];

            return (
              <div
                key={col.id}
                className="w-80 shrink-0 flex flex-col rounded-xl border bg-muted/20 shadow-sm overflow-hidden"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b bg-card px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.colorClass}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {t(col.labelKey)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold">
                    {list.length}
                  </Badge>
                </div>

                {/* Droppable Column Area */}
                <DroppableColumn status={col.id}>
                  {list.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground italic">
                      {t("kanban.noTickets")}
                    </div>
                  ) : (
                    list.map((ticket) => (
                      <DraggableITTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onClick={handleCardClick}
                      />
                    ))
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTicket ? (
            <div className="rotate-2 opacity-90 w-72">
              <ITTicketCard ticket={activeTicket} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals & Dialogs */}
      <ITTicketCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTicket}
      />

      <ITTicketAssignDialog
        open={!!selectedTicketForAssign}
        onClose={() => setSelectedTicketForAssign(null)}
        ticket={selectedTicketForAssign}
        technicians={technicians}
        onSubmit={handleAssignSubmit}
      />

      <ITTicketStatusDialog
        open={!!selectedTicketForStatus}
        onClose={() => setSelectedTicketForStatus(null)}
        ticket={selectedTicketForStatus}
        onSubmit={handleStatusSubmit}
      />

      <DeleteDialog
        open={!!deletingTicketId}
        onOpenChange={(open) => {
          if (!open) setDeletingTicketId(null);
        }}
        onConfirm={() => {
          if (deletingTicketId) {
            handleDeleteTicket(deletingTicketId);
            setDeletingTicketId(null);
          }
        }}
        title={t("dialogs.actions.deleteTicket")}
        description={t("dialogs.deleteConfirmDesc")}
      />
    </div>
  );
}
