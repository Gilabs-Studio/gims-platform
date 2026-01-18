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
import { useVillages, useDeleteVillage } from "../../hooks/use-villages";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDistricts } from "../../hooks/use-districts";
import { VillageForm } from "./village-form";
import type { Village } from "../../types";

export function VillageList() {
  const t = useTranslations("geographic");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [districtId, setDistrictId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: districtsData } = useDistricts({ per_page: 100 });
  const districts = districtsData?.data ?? [];

  const { data, isLoading, isError } = useVillages({
    page, per_page: 10, search: search || undefined, district_id: districtId || undefined,
  });

  const canCreate = useUserPermission("village.create");
  const canUpdate = useUserPermission("village.update");
  const canDelete = useUserPermission("village.delete");

  const deleteVillage = useDeleteVillage();
  const villages = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (village: Village) => { setEditingVillage(village); setIsFormOpen(true); };
  const handleDelete = async () => { if (deletingId) { await deleteVillage.mutateAsync(deletingId); setDeletingId(null); } };
  const handleFormClose = () => { setIsFormOpen(false); setEditingVillage(null); };

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
        <h1 className="text-3xl font-bold tracking-tight">{t("village.title")}</h1>
        <p className="text-muted-foreground">{t("village.subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("village.search") || t("common.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" /></div>
        <Select value={districtId} onValueChange={(v) => { setDistrictId(v === "all" ? "" : v); setPage(1); }}><SelectTrigger className="w-48"><SelectValue placeholder={t("village.selectDistrict")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.filterBy")} {t("district.title")}</SelectItem>{districts.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent></Select>
        <div className="flex-1" />
        {canCreate && (<Button onClick={() => setIsFormOpen(true)} className="cursor-pointer"><Plus className="h-4 w-4 mr-2" />{t("village.add")}</Button>)}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.code")}</TableHead><TableHead>{t("village.postalCode")}</TableHead><TableHead>{t("village.type")}</TableHead><TableHead>{t("district.title")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="w-[70px]" /></TableRow></TableHeader>
          <TableBody>
            {villages.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t("village.notFound")}</TableCell></TableRow>) : (
              villages.map((village) => (
                <TableRow key={village.id}>
                  <TableCell className="font-medium">{village.name}</TableCell>
                  <TableCell>{village.code}</TableCell>
                  <TableCell>{village.postal_code || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{village.type === "village" ? t("village.types.village") : t("village.types.kelurahan")}</Badge></TableCell>
                  <TableCell>{village.district?.name || "-"}</TableCell>
                  <TableCell><Badge variant={village.is_active ? "default" : "secondary"}>{village.is_active ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (<DropdownMenuItem onClick={() => handleEdit(village)} className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />{t("common.edit")}</DropdownMenuItem>)}
                          {canDelete && (<DropdownMenuItem onClick={() => setDeletingId(village.id)} className="text-destructive cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />{t("common.delete")}</DropdownMenuItem>)}
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

      {canCreate && (<VillageForm open={isFormOpen} onClose={handleFormClose} village={editingVillage} districts={districts} />)}
      {canDelete && (
        <DeleteDialog 
          open={!!deletingId} 
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("village.delete")}
          description={t("village.deleteDesc")}
          itemName={t("village.itemName")}
          isLoading={deleteVillage.isPending}
        />
      )}
    </div>
  );
}
