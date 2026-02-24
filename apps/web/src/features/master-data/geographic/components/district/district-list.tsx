"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { DistrictForm } from "./district-form";
import { sortOptions } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDistrictList } from "../../hooks/use-district-list";

export function DistrictList() {
  const { state, actions, data, permissions, translations } = useDistrictList();
  const { t } = translations;

  if (data.isLoading) {
    return null; // Handled by Suspense/Loading
  }

  if (data.isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("district.title")}</h1>
        <p className="text-muted-foreground">{t("district.subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("district.search") || t("common.search")} 
            value={state.search} 
            onChange={(e) => { actions.setSearch(e.target.value); actions.setPage(1); }} 
            className="pl-9" 
          />
        </div>
        <Select value={state.cityId} onValueChange={(v) => { actions.setCityId(v === "all" ? "" : v); actions.setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("district.selectCity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("city.title")}</SelectItem>
            {sortOptions(data.cities, (c) => c.name).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("district.add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.code")}</TableHead>
              <TableHead>{t("city.title")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && <TableHead className="w-[70px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.districts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={permissions.canUpdate || permissions.canDelete ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  {t("district.notFound")}
                </TableCell>
              </TableRow>
            ) : (
              data.districts.map((district) => (
                <TableRow key={district.id}>
                  <TableCell className="font-medium">{district.name}</TableCell>
                  <TableCell>{district.code}</TableCell>
                  <TableCell>{district.city?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={district.is_active}
                        onCheckedChange={() => actions.handleStatusChange(district.id, district.is_active)}
                        disabled={data.isUpdating || !permissions.canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {district.is_active ? t("common.active") : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {permissions.canUpdate && (
                            <DropdownMenuItem onClick={() => actions.handleEdit(district)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />{t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <DropdownMenuItem onClick={() => actions.setDeletingId(district.id)} className="text-destructive cursor-pointer">
                              <Trash2 className="h-4 w-4 mr-2" />{t("common.delete")}
                            </DropdownMenuItem>
                          )}
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

      {data.pagination && (
        <DataTablePagination
          pageIndex={data.pagination.page}
          pageSize={data.pagination.per_page}
          rowCount={data.pagination.total}
          onPageChange={actions.setPage}
          onPageSizeChange={(newSize) => {
            actions.setPageSize(newSize);
            actions.setPage(1);
          }}
        />
      )}

      {(permissions.canCreate || permissions.canUpdate) && (
        <DistrictForm open={state.isFormOpen} onClose={actions.handleFormClose} district={state.editingDistrict} cities={data.cities} />
      )}
      
      {permissions.canDelete && (
        <DeleteDialog 
          open={!!state.deletingId} 
          onOpenChange={(open) => !open && actions.setDeletingId(null)}
          onConfirm={actions.handleDelete}
          title={t("district.delete")}
          description={t("district.deleteDesc")}
          itemName={t("district.itemName")}
          isLoading={data.isDeleting}
        />
      )}
    </div>
  );
}
