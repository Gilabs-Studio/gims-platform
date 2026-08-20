"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Search,
  Plus,
  Eye,
  MoreHorizontal,
  Wrench,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ticket as TicketIcon,
  Trash2,
  MapPin,
  Calendar,
} from "lucide-react";
import { useTickets } from "../hooks/use-tickets";
import { TicketStatusBadge } from "./ticket-status-badge";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketCreateDialog } from "./ticket-create-dialog";
import { TicketAssignDialog } from "./ticket-assign-dialog";
import { TicketStatusDialog } from "./ticket-status-dialog";
import { TicketDetailModal } from "./ticket-detail-modal";
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "../types/ticketing.types";

export function TicketingPage() {
  const t = useTranslations("ticketing");

  const {
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
    tickets,
    totalCount,
    statistics,
    technicians,
    handleCreateTicket,
    handleAssignTechnician,
    handleUpdateStatus,
    handleDeleteTicket,
  } = useTickets();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<Ticket | null>(null);
  const [selectedTicketForStatus, setSelectedTicketForStatus] = useState<Ticket | null>(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<Ticket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  // TODO: connect with user permissions from auth state when active
  // const canManageTickets = useUserPermission("ticketing.manage");

  return (
    <div className="space-y-6">
      {/* Title & Primary CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.total")}
            </span>
            <TicketIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{statistics.total}</div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.open")}
            </span>
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-bold text-warning">{statistics.open}</div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.inProgress")}
            </span>
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{statistics.in_progress}</div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.resolved")}
            </span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold text-success">{statistics.resolved}</div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.urgent")}
            </span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold text-destructive">{statistics.high_priority}</div>
        </div>
      </div>

      {/* Unified Perspective Tabs (Staff Reporter vs Manage Admin/Technician) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as "my_tickets" | "manage_tickets");
          setPage(1);
        }}
        className="space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="my_tickets" className="cursor-pointer">
              {t("tabs.myTickets")}
            </TabsTrigger>
            <TabsTrigger value="manage_tickets" className="cursor-pointer">
              {t("tabs.manageTickets")}
            </TabsTrigger>
          </TabsList>

          {/* Filters Bar: Search & Category & Priority & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("filters.searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val as TicketCategory | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] cursor-pointer">
                <SelectValue placeholder={t("filters.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("filters.allCategories")}</SelectItem>
                <SelectItem value="it_hardware" className="cursor-pointer">{t("categories.it_hardware")}</SelectItem>
                <SelectItem value="it_software" className="cursor-pointer">{t("categories.it_software")}</SelectItem>
                <SelectItem value="facility_ac" className="cursor-pointer">{t("categories.facility_ac")}</SelectItem>
                <SelectItem value="facility_plumbing" className="cursor-pointer">{t("categories.facility_plumbing")}</SelectItem>
                <SelectItem value="facility_electrical" className="cursor-pointer">{t("categories.facility_electrical")}</SelectItem>
                <SelectItem value="general_maintenance" className="cursor-pointer">{t("categories.general_maintenance")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val as TicketStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] cursor-pointer">
                <SelectValue placeholder={t("filters.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("filters.allStatuses")}</SelectItem>
                <SelectItem value="open" className="cursor-pointer">{t("status.open")}</SelectItem>
                <SelectItem value="assigned" className="cursor-pointer">{t("status.assigned")}</SelectItem>
                <SelectItem value="in_progress" className="cursor-pointer">{t("status.in_progress")}</SelectItem>
                <SelectItem value="resolved" className="cursor-pointer">{t("status.resolved")}</SelectItem>
                <SelectItem value="closed" className="cursor-pointer">{t("status.closed")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onValueChange={(val) => {
                setPriorityFilter(val as TicketPriority | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] cursor-pointer">
                <SelectValue placeholder={t("filters.allPriorities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("filters.allPriorities")}</SelectItem>
                <SelectItem value="low" className="cursor-pointer">{t("priority.low")}</SelectItem>
                <SelectItem value="medium" className="cursor-pointer">{t("priority.medium")}</SelectItem>
                <SelectItem value="high" className="cursor-pointer">{t("priority.high")}</SelectItem>
                <SelectItem value="urgent" className="cursor-pointer text-destructive font-bold">{t("priority.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Contents - Shared Data Table Component Layout */}
        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <div className="rounded-md border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[130px]">{t("table.ticketNumber")}</TableHead>
                  <TableHead>{t("table.title")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.reporter")}</TableHead>
                  <TableHead>{t("table.technician")}</TableHead>
                  <TableHead>{t("table.priority")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      {t("table.emptyTickets")}
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      {/* Ticket Number */}
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketForDetail(item)}
                          className="hover:underline cursor-pointer text-left"
                        >
                          {item.ticket_number}
                        </button>
                      </TableCell>

                      {/* Title & Location */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketForDetail(item)}
                            className="font-medium text-foreground hover:text-primary transition-colors text-left cursor-pointer line-clamp-1 text-xs sm:text-sm"
                          >
                            {item.title}
                          </button>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{item.location}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {t(`categories.${item.category}`)}
                      </TableCell>

                      {/* Reporter */}
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-medium text-foreground">{item.reporter.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.reporter.department}</p>
                        </div>
                      </TableCell>

                      {/* Assigned Technician */}
                      <TableCell>
                        {item.assigned_technician ? (
                          <div className="text-xs">
                            <p className="font-medium text-foreground">{item.assigned_technician.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.assigned_technician.role}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {t("detail.unassigned")}
                          </span>
                        )}
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <TicketPriorityBadge priority={item.priority} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <TicketStatusBadge status={item.status} />
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedTicketForDetail(item)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("dialogs.actions.viewDetail")}
                            </DropdownMenuItem>

                            {activeTab === "manage_tickets" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setSelectedTicketForAssign(item)}
                                  className="cursor-pointer"
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  {t("dialogs.actions.assignTech")}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setSelectedTicketForStatus(item)}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                                  {t("dialogs.actions.updateStatus")}
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuItem
                              onClick={() => setDeletingTicketId(item.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("dialogs.actions.deleteTicket")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <DataTablePagination
            pageIndex={page}
            pageSize={pageSize}
            rowCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog Modals */}
      <TicketCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTicket}
      />

      <TicketAssignDialog
        open={!!selectedTicketForAssign}
        onClose={() => setSelectedTicketForAssign(null)}
        ticket={selectedTicketForAssign}
        technicians={technicians}
        onSubmit={handleAssignTechnician}
      />

      <TicketStatusDialog
        open={!!selectedTicketForStatus}
        onClose={() => setSelectedTicketForStatus(null)}
        ticket={selectedTicketForStatus}
        onSubmit={handleUpdateStatus}
      />

      <TicketDetailModal
        open={!!selectedTicketForDetail}
        onClose={() => setSelectedTicketForDetail(null)}
        ticket={selectedTicketForDetail}
        onAssignTech={
          activeTab === "manage_tickets"
            ? (tck) => {
                setSelectedTicketForDetail(null);
                setSelectedTicketForAssign(tck);
              }
            : undefined
        }
        onUpdateStatus={
          activeTab === "manage_tickets"
            ? (tck) => {
                setSelectedTicketForDetail(null);
                setSelectedTicketForStatus(tck);
              }
            : undefined
        }
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
