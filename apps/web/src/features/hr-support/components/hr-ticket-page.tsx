"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  Trash2,
  MapPin,
  Users,
  Box,
} from "lucide-react";
import { useHRTickets } from "../hooks/use-hr-tickets";
import { HRTicketCreateDialog } from "./hr-ticket-create-dialog";
import { HRTicketAssignDialog } from "./hr-ticket-assign-dialog";
import { HRTicketStatusDialog } from "./hr-ticket-status-dialog";
import { HRTicketDetailModal } from "./hr-ticket-detail-modal";
import type { HRTicket, HRTicketCategory, HRTicketPriority, HRTicketStatus } from "../types/hr-ticket.types";

function PriorityBadge({ priority }: { priority: HRTicketPriority }) {
  const t = useTranslations("hrSupport");
  const variantMap: Record<HRTicketPriority, "destructive" | "warning" | "active" | "secondary"> = {
    urgent: "destructive",
    high: "warning",
    medium: "active",
    low: "secondary",
  };

  return (
    <Badge variant={variantMap[priority]} className="text-[10px] uppercase font-bold px-1.5 py-0.5">
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
    <Badge variant={variantMap[status]} className="text-[10px] uppercase font-bold px-1.5 py-0.5">
      {t(`status.${status}`)}
    </Badge>
  );
}

export function HRTicketPage() {
  const t = useTranslations("hrSupport");

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
  } = useHRTickets();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<HRTicket | null>(null);
  const [selectedTicketForStatus, setSelectedTicketForStatus] = useState<HRTicket | null>(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<HRTicket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

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
            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("createButton")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="py-4 transition-all hover:shadow-md">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t("stats.total")}</span>
              <Box className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>

        <Card className="py-4 transition-all hover:shadow-md">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t("stats.open")}</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-500">{statistics.open}</div>
          </CardContent>
        </Card>

        <Card className="py-4 transition-all hover:shadow-md">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t("stats.inProgress")}</span>
              <Wrench className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-500">{statistics.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="py-4 transition-all hover:shadow-md">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t("stats.resolved")}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{statistics.resolved}</div>
          </CardContent>
        </Card>

        <Card className="py-4 transition-all hover:shadow-md">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t("stats.urgent")}</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-600">{statistics.high_priority}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filter Bar */}
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

          {/* Filters Bar */}
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
                setCategoryFilter(val as HRTicketCategory | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px] cursor-pointer">
                <SelectValue placeholder={t("filters.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("filters.allCategories")}</SelectItem>
                <SelectItem value="hr_asset_repair" className="cursor-pointer">{t("categories.hr_asset_repair")}</SelectItem>
                <SelectItem value="hr_asset_replacement" className="cursor-pointer">{t("categories.hr_asset_replacement")}</SelectItem>
                <SelectItem value="hr_facility_building" className="cursor-pointer">{t("categories.hr_facility_building")}</SelectItem>
                <SelectItem value="hr_payroll_admin" className="cursor-pointer">{t("categories.hr_payroll_admin")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val as HRTicketStatus | "all");
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
                setPriorityFilter(val as HRTicketPriority | "all");
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
                <SelectItem value="urgent" className="cursor-pointer text-rose-600 font-bold">{t("priority.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table with DIRECT ASSET PHOTO COLUMN */}
        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[85px] text-center">{t("table.assetPhoto")}</TableHead>
                  <TableHead className="w-[120px]">{t("table.ticketNumber")}</TableHead>
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
                      colSpan={9}
                      className="text-center py-12 text-muted-foreground text-sm"
                    >
                      {t("table.emptyTickets")}
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((item) => {
                    const photo = item.asset_photo || item.photos?.[0];

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                        {/* DIRECT ASSET PHOTO COLUMN */}
                        <TableCell className="text-center">
                          {photo ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl(photo)}
                              className="relative h-12 w-14 rounded-lg overflow-hidden border border-border group cursor-pointer hover:border-emerald-500 transition-all inline-block align-middle"
                              title="Klik untuk memperbesar foto aset"
                            >
                              <img
                                src={photo}
                                alt={item.asset_name || item.title}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="h-3.5 w-3.5" />
                              </div>
                            </button>
                          ) : (
                            <div className="h-12 w-14 rounded-lg border bg-muted/40 flex flex-col items-center justify-center text-muted-foreground mx-auto">
                              <Box className="h-4 w-4" />
                              <span className="text-[9px] mt-0.5">No Asset</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Ticket Number */}
                        <TableCell className="font-mono text-xs font-bold text-emerald-600">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketForDetail(item)}
                            className="hover:underline cursor-pointer text-left"
                          >
                            {item.ticket_number}
                          </button>
                        </TableCell>

                        {/* Asset Name & Title */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTicketForDetail(item)}
                              className="font-semibold text-foreground hover:text-emerald-600 transition-colors text-left cursor-pointer line-clamp-1 text-xs sm:text-sm"
                            >
                              {item.title}
                            </button>
                            {item.asset_name && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Badge variant="outline" className="text-[10px] font-medium text-emerald-700 bg-emerald-500/10 border-emerald-500/20 px-1.5 py-0.5">
                                  {item.asset_code || "ASET"}
                                </Badge>
                                <span className="truncate max-w-[200px]">{item.asset_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate max-w-[190px]">{item.location}</span>
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
                          <PriorityBadge priority={item.priority} />
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>

                        {/* Actions */}
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
                                <Eye className="h-4 w-4 mr-2 text-emerald-600" />
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
                    );
                  })
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

      {/* Lightbox / Zoom Dialog for Asset Photo */}
      <Dialog open={!!previewPhotoUrl} onOpenChange={(o) => !o && setPreviewPhotoUrl(null)}>
        <DialogContent className="sm:max-w-[700px] p-2 bg-black/90 border-none">
          {previewPhotoUrl && (
            <div className="relative w-full flex items-center justify-center p-2">
              <img
                src={previewPhotoUrl}
                alt="Foto Aset Zoom"
                className="max-h-[80vh] w-auto rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Modals */}
      <HRTicketCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTicket}
      />

      <HRTicketAssignDialog
        open={!!selectedTicketForAssign}
        onClose={() => setSelectedTicketForAssign(null)}
        ticket={selectedTicketForAssign}
        technicians={technicians}
        onSubmit={handleAssignTechnician}
      />

      <HRTicketStatusDialog
        open={!!selectedTicketForStatus}
        onClose={() => setSelectedTicketForStatus(null)}
        ticket={selectedTicketForStatus}
        onSubmit={handleUpdateStatus}
      />

      <HRTicketDetailModal
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
