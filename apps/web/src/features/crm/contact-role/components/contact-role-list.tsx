"use client";

import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Switch } from "@/components/ui/switch";
import { ContactRoleDialog } from "./contact-role-dialog";
import { useContactRoleList } from "../hooks/use-contact-role-list";

export function ContactRoleList() {
  const { state, actions, data, permissions, translations } = useContactRoleList();
  const { t, tCommon } = translations;

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button variant="outline" onClick={() => data.refetch()} className="mt-4 ml-2 cursor-pointer">{tCommon("retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer"><Plus className="mr-2 h-4 w-4" />{t("create")}</Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={tCommon("search")} value={state.search} onChange={(e) => { actions.setSearch(e.target.value); actions.setPage(1); }} className="pl-8" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("form.name")}</TableHead>
              <TableHead>{t("form.code")}</TableHead>
              <TableHead>{t("form.badgeColor")}</TableHead>
              <TableHead>{t("form.description")}</TableHead>
              <TableHead>{t("form.isActive")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={permissions.canUpdate || permissions.canDelete ? 6 : 5} className="h-24 text-center text-muted-foreground">{t("empty")}</TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.badge_color }} />
                      <span className="text-sm text-muted-foreground">{item.badge_color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{item.description ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={item.is_active} onCheckedChange={() => actions.handleStatusChange(item.id, item.is_active, item.name)} disabled={data.isUpdating || !permissions.canUpdate} className="cursor-pointer" />
                      <span className="text-sm text-muted-foreground">{item.is_active ? tCommon("active") : tCommon("inactive")}</span>
                    </div>
                  </TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {permissions.canUpdate && <DropdownMenuItem onClick={() => actions.handleEdit(item)} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />{tCommon("edit")}</DropdownMenuItem>}
                          {permissions.canUpdate && permissions.canDelete && <DropdownMenuSeparator />}
                          {permissions.canDelete && <DropdownMenuItem onClick={() => actions.setDeleteId(item.id)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />{tCommon("delete")}</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.pagination && <DataTablePagination pageIndex={data.pagination.page} pageSize={data.pagination.per_page} rowCount={data.pagination.total} onPageChange={actions.setPage} onPageSizeChange={(newSize) => { actions.setPageSize(newSize); actions.setPage(1); }} />}
      {(permissions.canCreate || permissions.canUpdate) && <ContactRoleDialog open={state.dialogOpen} onOpenChange={actions.handleDialogClose} editingItem={state.editingItem} />}
      {permissions.canDelete && <DeleteDialog open={!!state.deleteId} onOpenChange={(open) => !open && actions.setDeleteId(null)} onConfirm={actions.handleDelete} itemName="contact role" isLoading={data.isDeleting} />}
    </div>
  );
}
