"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useProvinces, useDeleteProvince, useUpdateProvince } from "../../hooks/use-provinces";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCountries } from "../../hooks/use-countries";
import { ProvinceForm } from "./province-form";
import { sortOptions } from "@/lib/utils";
import type { Province } from "../../types";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function ProvinceList() {
  const t = useTranslations("geographic");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [countryId, setCountryId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: countriesData } = useCountries({ per_page: 100 });
  const countries = countriesData?.data ?? [];

  const { data, isLoading, isError } = useProvinces({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    country_id: countryId || undefined,
  });

  const canCreate = useUserPermission("province.create");
  const canUpdate = useUserPermission("province.update");
  const canDelete = useUserPermission("province.delete");

  const deleteProvince = useDeleteProvince();
  const updateProvince = useUpdateProvince();
  const provinces = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (province: Province) => {
    setEditingProvince(province);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteProvince.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
  ) => {
    try {
      await updateProvince.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProvince(null);
  };

  if (isLoading) {
    return null; // Handled by Suspense/Loading
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("province.title")}</h1>
        <p className="text-muted-foreground">{t("province.subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("province.search") || t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={countryId} onValueChange={(v) => { setCountryId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("province.selectCountry")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("country.title")}</SelectItem>
            {sortOptions(countries, (c) => c.name).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("province.add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.code")}</TableHead>
              <TableHead>{t("country.title")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {provinces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("province.notFound")}
                </TableCell>
              </TableRow>
            ) : (
              provinces.map((province) => (
                <TableRow key={province.id}>
                  <TableCell className="font-medium">{province.name}</TableCell>
                  <TableCell>{province.code}</TableCell>
                  <TableCell>{province.country?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={province.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(
                            province.id,
                            province.is_active,
                          )
                        }
                        disabled={updateProvince.isPending || !canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {province.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => handleEdit(province)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />{t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => setDeletingId(province.id)} className="text-destructive cursor-pointer">
                              <Trash2 className="h-4 w-4 mr-2" />{t("common.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

      {canCreate && (
        <ProvinceForm open={isFormOpen} onClose={handleFormClose} province={editingProvince} countries={countries} />
      )}

      {canDelete && (
        <DeleteDialog 
          open={!!deletingId} 
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("province.delete")}
          description={t("province.deleteDesc")}
          itemName={t("province.itemName")}
          isLoading={deleteProvince.isPending}
        />
      )}
    </div>
  );
}
