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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useCountries, useDeleteCountry, useUpdateCountry } from "../../hooks/use-countries";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CountryForm } from "./country-form";
import type { Country } from "../../types";

export function CountryList() {
  const t = useTranslations("geographic");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useCountries({
    page,
    per_page: 10,
    search: debouncedSearch || undefined,
  });

  const canCreate = useUserPermission("country.create");
  const canUpdate = useUserPermission("country.update");
  const canDelete = useUserPermission("country.delete");

  const deleteCountry = useDeleteCountry();
  const updateCountry = useUpdateCountry();

  const countries = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCountry.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
  ) => {
    try {
      await updateCountry.mutateAsync({
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
    setEditingCountry(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
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
        <h1 className="text-3xl font-bold tracking-tight">{t("country.title")}</h1>
        <p className="text-muted-foreground">{t("country.subtitle")}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("country.search") || t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("country.add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.code")}</TableHead>
              <TableHead>{t("country.phoneCode")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("country.notFound")}
                </TableCell>
              </TableRow>
            ) : (
              countries.map((country) => (
                <TableRow key={country.id}>
                  <TableCell className="font-medium">{country.name}</TableCell>
                  <TableCell>{country.code}</TableCell>
                  <TableCell>{country.phone_code || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={country.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(
                            country.id,
                            country.is_active,
                          )
                        }
                        disabled={updateCountry.isPending || !canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {country.is_active
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
                            <DropdownMenuItem onClick={() => handleEdit(country)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(country.id)}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
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

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.page")} {pagination.page} {t("common.of")} {pagination.total_pages} ({pagination.total} {t("common.total")})
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer"
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

      {canCreate && (
        <CountryForm
          open={isFormOpen}
          onClose={handleFormClose}
          country={editingCountry}
        />
      )}

      {canDelete && (
        <DeleteDialog 
          open={!!deletingId} 
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("country.delete")}
          description={t("country.deleteDesc")}
          itemName={t("country.itemName")}
          isLoading={deleteCountry.isPending}
        />
      )}
    </div>
  );
}
