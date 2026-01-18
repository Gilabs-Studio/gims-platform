"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useCities, useDeleteCity } from "../../hooks/use-cities";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useProvinces } from "../../hooks/use-provinces";
import { CityForm } from "./city-form";
import type { City } from "../../types";

export function CityList() {
  const t = useTranslations("geographic");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [provinceId, setProvinceId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: provincesData } = useProvinces({ per_page: 100 });
  const provinces = provincesData?.data ?? [];

  const { data, isLoading, isError } = useCities({
    page, per_page: 10, search: search || undefined, province_id: provinceId || undefined,
  });

  const canCreate = useUserPermission("city.create");
  const canUpdate = useUserPermission("city.update");
  const canDelete = useUserPermission("city.delete");

  const deleteCity = useDeleteCity();
  const cities = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (city: City) => { setEditingCity(city); setIsFormOpen(true); };
  const handleDelete = async () => { if (deletingId) { await deleteCity.mutateAsync(deletingId); setDeletingId(null); } };
  const handleFormClose = () => { setIsFormOpen(false); setEditingCity(null); };

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
        <h1 className="text-3xl font-bold tracking-tight">{t("city.title")}</h1>
        <p className="text-muted-foreground">{t("city.subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("city.search") || t("common.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" /></div>
        <Select value={provinceId} onValueChange={(v) => { setProvinceId(v === "all" ? "" : v); setPage(1); }}><SelectTrigger className="w-48"><SelectValue placeholder={t("city.selectProvince")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.filterBy")} {t("province.title")}</SelectItem>{provinces.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select>
        <div className="flex-1" />
        {canCreate && (<Button onClick={() => setIsFormOpen(true)} className="cursor-pointer"><Plus className="h-4 w-4 mr-2" />{t("city.add")}</Button>)}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.code")}</TableHead><TableHead>{t("city.type")}</TableHead><TableHead>{t("province.title")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="w-[70px]" /></TableRow></TableHeader>
          <TableBody>
            {cities.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("city.notFound")}</TableCell></TableRow>) : (
              cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell>{city.code}</TableCell>
                  <TableCell><Badge variant="outline">{city.type === "city" ? t("city.types.city") : t("city.types.regency")}</Badge></TableCell>
                  <TableCell>{city.province?.name || "-"}</TableCell>
                  <TableCell><Badge variant={city.is_active ? "default" : "secondary"}>{city.is_active ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (<DropdownMenuItem onClick={() => handleEdit(city)} className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />{t("common.edit")}</DropdownMenuItem>)}
                          {canDelete && (<DropdownMenuItem onClick={() => setDeletingId(city.id)} className="text-destructive cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />{t("common.delete")}</DropdownMenuItem>)}
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

      {pagination && pagination.total_pages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{t("common.page")} {pagination.page} {t("common.of")} {pagination.total_pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!pagination.has_prev} onClick={() => setPage(page - 1)} className="cursor-pointer">{t("common.previous")}</Button><Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setPage(page + 1)} className="cursor-pointer">{t("common.next")}</Button></div></div>)}

      {canCreate && (<CityForm open={isFormOpen} onClose={handleFormClose} city={editingCity} provinces={provinces} />)}
      {canDelete && (
        <DeleteDialog 
          open={!!deletingId} 
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("city.delete")}
          description={t("city.deleteDesc")}
          itemName={t("city.itemName")}
          isLoading={deleteCity.isPending}
        />
      )}
    </div>
  );
}
