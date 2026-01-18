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
import { useDistricts, useDeleteDistrict } from "../../hooks/use-districts";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCities } from "../../hooks/use-cities";
import { DistrictForm } from "./district-form";
import type { District } from "../../types";

export function DistrictList() {
  const t = useTranslations("geographic");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cityId, setCityId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: citiesData } = useCities({ per_page: 100 });
  const cities = citiesData?.data ?? [];

  const { data, isLoading, isError } = useDistricts({
    page, per_page: 10, search: search || undefined, city_id: cityId || undefined,
  });

  const canCreate = useUserPermission("district.create");
  const canUpdate = useUserPermission("district.update");
  const canDelete = useUserPermission("district.delete");

  const deleteDistrict = useDeleteDistrict();
  const districts = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (district: District) => { setEditingDistrict(district); setIsFormOpen(true); };
  const handleDelete = async () => { if (deletingId) { await deleteDistrict.mutateAsync(deletingId); setDeletingId(null); } };
  const handleFormClose = () => { setIsFormOpen(false); setEditingDistrict(null); };

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
        <h1 className="text-3xl font-bold tracking-tight">{t("district.title")}</h1>
        <p className="text-muted-foreground">{t("district.subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("district.search") || t("common.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" /></div>
        <Select value={cityId} onValueChange={(v) => { setCityId(v === "all" ? "" : v); setPage(1); }}><SelectTrigger className="w-48"><SelectValue placeholder={t("district.selectCity")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.filterBy")} {t("city.title")}</SelectItem>{cities.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
        <div className="flex-1" />
        {canCreate && (<Button onClick={() => setIsFormOpen(true)} className="cursor-pointer"><Plus className="h-4 w-4 mr-2" />{t("district.add")}</Button>)}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.code")}</TableHead><TableHead>{t("city.title")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="w-[70px]" /></TableRow></TableHeader>
          <TableBody>
            {districts.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("district.notFound")}</TableCell></TableRow>) : (
              districts.map((district) => (
                <TableRow key={district.id}>
                  <TableCell className="font-medium">{district.name}</TableCell>
                  <TableCell>{district.code}</TableCell>
                  <TableCell>{district.city?.name || "-"}</TableCell>
                  <TableCell><Badge variant={district.is_active ? "default" : "secondary"}>{district.is_active ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (<DropdownMenuItem onClick={() => handleEdit(district)} className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />{t("common.edit")}</DropdownMenuItem>)}
                          {canDelete && (<DropdownMenuItem onClick={() => setDeletingId(district.id)} className="text-destructive cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />{t("common.delete")}</DropdownMenuItem>)}
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

      {canCreate && (<DistrictForm open={isFormOpen} onClose={handleFormClose} district={editingDistrict} cities={cities} />)}
      {canDelete && (
        <DeleteDialog 
          open={!!deletingId} 
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("district.delete")}
          description={t("district.deleteDesc")}
          itemName={t("district.itemName")}
          isLoading={deleteDistrict.isPending}
        />
      )}
    </div>
  );
}
