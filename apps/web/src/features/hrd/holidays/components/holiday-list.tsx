"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useHolidays, useDeleteHoliday } from "../hooks/use-holidays";
import type { Holiday, HolidayType } from "../types";
import { HolidayDialog } from "./holiday-dialog";
import { HolidayCalendarView } from "./holiday-calendar-view";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export function HolidayList() {
  const t = useTranslations("hrd.holiday");
  const tCommon = useTranslations("common");

  const currentYear = new Date().getFullYear();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Holiday | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  const { data, isLoading, isError, refetch } = useHolidays({
    page,
    per_page: pageSize,
    year: yearFilter !== "all" ? Number(yearFilter) : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const deleteMutation = useDeleteHoliday();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Holiday) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("messages.deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const getTypeBadgeVariant = (type: HolidayType) => {
    switch (type) {
      case "NATIONAL":
        return "default";
      case "COLLECTIVE":
        return "secondary";
      case "COMPANY":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEE, dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  // Generate year options (5 years back and 2 years forward)
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="mt-4 ml-2 cursor-pointer"
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.create")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="cursor-pointer gap-2">
            <CalendarDays className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="cursor-pointer gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tCommon("search")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={yearFilter}
              onValueChange={(value) => {
                setYearFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] cursor-pointer">
                <SelectValue placeholder={t("fields.year")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  {tCommon("all")}
                </SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem
                    key={year}
                    value={String(year)}
                    className="cursor-pointer"
                  >
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 cursor-pointer">
                <SelectValue placeholder={t("fields.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  {tCommon("all")}
                </SelectItem>
                <SelectItem value="NATIONAL" className="cursor-pointer">
                  {t("types.NATIONAL")}
                </SelectItem>
                <SelectItem value="COLLECTIVE" className="cursor-pointer">
                  {t("types.COLLECTIVE")}
                </SelectItem>
                <SelectItem value="COMPANY" className="cursor-pointer">
                  {t("types.COMPANY")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.date")}</TableHead>
                  <TableHead>{t("fields.name")}</TableHead>
                  <TableHead>{t("fields.type")}</TableHead>
                  <TableHead>{t("fields.isCollectiveLeave")}</TableHead>
                  <TableHead>{t("fields.isActive")}</TableHead>
                  <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {tCommon("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(item.type)}>
                          {t(`types.${item.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.is_collective_leave ? (
                          <Badge variant="secondary">
                            {item.cuts_annual_leave ? "Cuts Leave" : "No Cut"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.is_active ? "default" : "secondary"}
                        >
                          {item.is_active ? tCommon("active") : tCommon("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {tCommon("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(item.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {tCommon("delete")}
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
          {pagination && (
            <DataTablePagination
              pageIndex={pagination.page}
              pageSize={pagination.per_page}
              rowCount={pagination.total}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <HolidayCalendarView
            year={Number(yearFilter) || currentYear}
            onYearChange={(year) => setYearFilter(String(year))}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <HolidayDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingItem={editingItem}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="holiday"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
