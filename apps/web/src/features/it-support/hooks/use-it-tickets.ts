"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  ITTicket,
  ITTicketCategory,
  ITTicketPriority,
  ITTicketStatus,
  ITTicketStatistics,
  ITTechnician,
} from "../types/it-ticket.types";
import type {
  CreateITTicketFormValues,
  AssignITTechnicianFormValues,
  UpdateITTicketStatusFormValues,
} from "../schemas/it-ticket.schema";
import { itTicketService } from "../services/it-ticket.service";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

export function useITTickets() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [categoryFilter, setCategoryFilter] = useState<ITTicketCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ITTicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<ITTicketPriority | "all">("all");

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const allTickets = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return itTicketService.getTickets({});
  }, [refreshKey]);

  const filteredTickets = useMemo(() => {
    return itTicketService.getTickets({
      search: debouncedSearch,
      category: categoryFilter,
      status: statusFilter,
      priority: priorityFilter,
    });
  }, [debouncedSearch, categoryFilter, statusFilter, priorityFilter, refreshKey]);

  const statistics: ITTicketStatistics = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return itTicketService.getStatistics();
  }, [refreshKey]);

  const technicians: ITTechnician[] = useMemo(() => {
    return itTicketService.getTechnicians();
  }, []);

  // Group tickets by status for Kanban Board
  const ticketsByStatus = useMemo(() => {
    const statuses: ITTicketStatus[] = [
      "open",
      "assigned",
      "in_progress",
      "pending_parts",
      "resolved",
      "closed",
    ];

    const grouped: Record<ITTicketStatus, ITTicket[]> = {
      open: [],
      assigned: [],
      in_progress: [],
      pending_parts: [],
      resolved: [],
      closed: [],
    };

    statuses.forEach((s) => {
      grouped[s] = filteredTickets.filter((t) => t.status === s);
    });

    return grouped;
  }, [filteredTickets]);

  const handleCreateTicket = useCallback(
    (data: CreateITTicketFormValues) => {
      const created = itTicketService.createTicket(data);
      toast.success(`Tiket IT #${created.ticket_number} berhasil dibuat!`);
      refresh();
      return created;
    },
    [refresh]
  );

  const handleAssignTechnician = useCallback(
    (ticketId: string, data: AssignITTechnicianFormValues) => {
      const updated = itTicketService.assignTechnician(ticketId, data);
      if (updated) {
        toast.success(`Teknisi IT berhasil ditugaskan ke tiket #${updated.ticket_number}`);
        refresh();
      }
      return updated;
    },
    [refresh]
  );

  const handleUpdateStatus = useCallback(
    (ticketId: string, data: UpdateITTicketStatusFormValues) => {
      const updated = itTicketService.updateTicketStatus(ticketId, data);
      if (updated) {
        toast.success(`Status tiket IT #${updated.ticket_number} diperbarui menjadi ${data.status}`);
        refresh();
      }
      return updated;
    },
    [refresh]
  );

  const handleDeleteTicket = useCallback(
    (ticketId: string) => {
      const success = itTicketService.deleteTicket(ticketId);
      if (success) {
        toast.success("Tiket IT telah dihapus");
        refresh();
      }
    },
    [refresh]
  );

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    allTickets,
    filteredTickets,
    ticketsByStatus,
    statistics,
    technicians,
    handleCreateTicket,
    handleAssignTechnician,
    handleUpdateStatus,
    handleDeleteTicket,
  };
}
