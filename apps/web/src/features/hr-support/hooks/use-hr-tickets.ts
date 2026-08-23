"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  HRTicketCategory,
  HRTicketPriority,
  HRTicketStatus,
  HRTicketStatistics,
  HRTechnician,
} from "../types/hr-ticket.types";
import type {
  CreateHRTicketFormValues,
  AssignHRTechnicianFormValues,
  UpdateHRTicketStatusFormValues,
} from "../schemas/hr-ticket.schema";
import { hrTicketService } from "../services/hr-ticket.service";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

export function useHRTickets() {
  const [activeTab, setActiveTab] = useState<"my_tickets" | "manage_tickets">("my_tickets");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [categoryFilter, setCategoryFilter] = useState<HRTicketCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<HRTicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<HRTicketPriority | "all">("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const allTickets = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return hrTicketService.getTickets({});
  }, [refreshKey]);

  const filteredTickets = useMemo(() => {
    return hrTicketService.getTickets({
      search: debouncedSearch,
      category: categoryFilter,
      status: statusFilter,
      priority: priorityFilter,
      assigned_to_me: activeTab === "my_tickets",
    });
  }, [debouncedSearch, categoryFilter, statusFilter, priorityFilter, activeTab, refreshKey]);

  const statistics: HRTicketStatistics = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return hrTicketService.getStatistics();
  }, [refreshKey]);

  const technicians: HRTechnician[] = useMemo(() => {
    return hrTicketService.getTechnicians();
  }, []);

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  const totalCount = filteredTickets.length;

  const handleCreateTicket = useCallback(
    (data: CreateHRTicketFormValues) => {
      const created = hrTicketService.createTicket(data);
      toast.success(`Tiket Aset #${created.ticket_number} berhasil dibuat!`);
      refresh();
      return created;
    },
    [refresh]
  );

  const handleAssignTechnician = useCallback(
    (ticketId: string, data: AssignHRTechnicianFormValues) => {
      const updated = hrTicketService.assignTechnician(ticketId, data);
      if (updated) {
        toast.success(`Petugas Aset berhasil ditugaskan ke tiket #${updated.ticket_number}`);
        refresh();
      }
      return updated;
    },
    [refresh]
  );

  const handleUpdateStatus = useCallback(
    (ticketId: string, data: UpdateHRTicketStatusFormValues) => {
      const updated = hrTicketService.updateTicketStatus(ticketId, data);
      if (updated) {
        toast.success(`Status tiket Aset #${updated.ticket_number} berhasil diperbarui`);
        refresh();
      }
      return updated;
    },
    [refresh]
  );

  const handleDeleteTicket = useCallback(
    (ticketId: string) => {
      const success = hrTicketService.deleteTicket(ticketId);
      if (success) {
        toast.success("Tiket Aset telah dihapus");
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
