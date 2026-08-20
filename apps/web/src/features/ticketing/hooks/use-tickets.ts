"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketStatistics,
  Technician,
} from "../types/ticketing.types";
import type {
  CreateTicketFormValues,
  AssignTechnicianFormValues,
  UpdateTicketStatusFormValues,
} from "../schemas/ticketing.schema";
import { ticketingService, MOCK_TECHNICIANS } from "../services/ticketing-service";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

export function useTickets() {
  const [activeTab, setActiveTab] = useState<"my_tickets" | "manage_tickets">("my_tickets");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Trigger state refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const allTickets = useMemo(() => {
    // eslint-disable-next-ignore-line unused-vars
    void refreshKey;
    return ticketingService.getTickets({});
  }, [refreshKey]);

  const filteredTickets = useMemo(() => {
    return ticketingService.getTickets({
      search: debouncedSearch,
      category: categoryFilter,
      status: statusFilter,
      priority: priorityFilter,
      assigned_to_me: activeTab === "my_tickets",
    });
  }, [debouncedSearch, categoryFilter, statusFilter, priorityFilter, activeTab, refreshKey]);

  const statistics: TicketStatistics = useMemo(() => {
    // eslint-disable-next-ignore-line unused-vars
    void refreshKey;
    return ticketingService.getStatistics();
  }, [refreshKey]);

  const technicians: Technician[] = useMemo(() => {
    return ticketingService.getTechnicians();
  }, []);

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  const totalCount = filteredTickets.length;

  const handleCreateTicket = useCallback(
    (data: CreateTicketFormValues) => {
      const created = ticketingService.createTicket(data);
      toast.success(`Tiket #${created.ticket_number} berhasil dibuat!`);
      refresh();
      return created;
    },
    [refresh]
  );

  const handleAssignTechnician = useCallback(
    (ticketId: string, data: AssignTechnicianFormValues) => {
      const updated = ticketingService.assignTechnician(ticketId, data);
      if (updated) {
        toast.success(`Teknisi berhasil ditugaskan ke tiket #${updated.ticket_number}`);
        refresh();
      }
      return updated;
    },
    [refresh]
  );

  const handleUpdateStatus = useCallback(
    (ticketId: string, data: UpdateTicketStatusFormValues) => {
      const updated = ticketingService.updateTicketStatus(ticketId, data);
      if (updated) {
        toast.success(`Status tiket #${updated.ticket_number} berhasil diperbarui`);
        refresh();
      }
      return updated;
    },
    [refresh]
  );

  const handleDeleteTicket = useCallback(
    (ticketId: string) => {
      const success = ticketingService.deleteTicket(ticketId);
      if (success) {
        toast.success("Tiket telah dihapus");
        refresh();
      }
    },
    [refresh]
  );

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    allTickets,
    tickets: paginatedTickets,
    totalCount,
    statistics,
    technicians,
    handleCreateTicket,
    handleAssignTechnician,
    handleUpdateStatus,
    handleDeleteTicket,
  };
}
