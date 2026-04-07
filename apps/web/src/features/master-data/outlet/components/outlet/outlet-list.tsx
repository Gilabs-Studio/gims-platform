"use client";

import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";
import { useOutletList } from "../../hooks/use-outlet-list";
import { OutletDialog } from "./outlet-dialog";
import { OutletDetailDialog } from "./outlet-detail-dialog";

export function OutletList() {
  const t = useTranslations("outlet");
  const { state, actions, data, permissions } = useOutletList();

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("outlet.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("outlet.description")}</p>
          </div>
          {permissions.canCreate && (
            <Button onClick={actions.handleCreate} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              {t("outlet.createTitle")}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={state.search}
              onChange={(e) => actions.setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("outlet.form.code")}</TableHead>
                <TableHead>{t("outlet.form.name")}</TableHead>
                <TableHead>{t("outlet.form.phone")}</TableHead>
                <TableHead>{t("outlet.form.manager")}</TableHead>
                <TableHead>{t("outlet.form.company")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={`skeleton-cell-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("outlet.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {item.warehouse_id && (
                          <Badge variant="outline" className="text-[10px]">
                            {t("outlet.hasWarehouse")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.phone || "-"}</TableCell>
                    <TableCell>{item.manager?.name ?? "-"}</TableCell>
                    <TableCell>{item.company?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => actions.handleViewDetail(item)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t("common.view")}
                          </DropdownMenuItem>
                          {permissions.canUpdate && (
                            <DropdownMenuItem
                              onClick={() => actions.handleEdit(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <DropdownMenuItem
                              onClick={() => actions.setDeleteId(item.id)}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          )}
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
        {data.pagination && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("common.showing", {
                from: (data.pagination.page - 1) * data.pagination.per_page + 1,
                to: Math.min(
                  data.pagination.page * data.pagination.per_page,
                  data.pagination.total
                ),
                total: data.pagination.total,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data.pagination.has_prev}
                onClick={() => actions.handlePageChange(data.pagination!.page - 1)}
                className="cursor-pointer"
              >
                {t("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.pagination.has_next}
                onClick={() => actions.handlePageChange(data.pagination!.page + 1)}
                className="cursor-pointer"
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}

        {/* Form Dialog */}
        <OutletDialog
          open={state.dialogOpen}
          onOpenChange={actions.setDialogOpen}
          editingItem={state.editingItem}
        />

        {/* Detail Dialog */}
        <OutletDetailDialog
          open={state.detailOpen}
          onOpenChange={actions.setDetailOpen}
          outlet={state.detailItem}
          onEdit={actions.handleEdit}
        />

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("outlet.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("outlet.deleteConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => state.deleteId && actions.handleDelete(state.deleteId)}
                className="cursor-pointer bg-destructive hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageMotion>
  );
}
