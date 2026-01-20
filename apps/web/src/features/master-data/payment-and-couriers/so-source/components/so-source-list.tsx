"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useSOSources, useDeleteSOSource, useUpdateSOSource } from "../hooks/use-so-source";
import { Switch } from "@/components/ui/switch";
import type { SOSource } from "../types";
import { SOSourceDialog } from "./so-source-dialog";

export function SOSourceList() {
  const t = useTranslations("soSource");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState(""); const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1); const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SOSource | null>(null); const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useSOSources({ page, per_page: 10, search: debouncedSearch || undefined });
  const deleteMutation = useDeleteSOSource(); const updateMutation = useUpdateSOSource();
  const items = data?.data ?? []; const pagination = data?.meta?.pagination;

  const handleCreate = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: SOSource) => { setEditingItem(item); setDialogOpen(true); };
  const handleDelete = async () => { if (!deleteId) return; try { await deleteMutation.mutateAsync(deleteId); toast.success(t("deleted")); setDeleteId(null); } catch { toast.error(tCommon("error")); } };
  const handleStatusChange = async (id: string, currentStatus: boolean, name: string) => { try { await updateMutation.mutateAsync({ id, data: { is_active: !currentStatus } }); toast.success(name + " status updated"); } catch { toast.error(tCommon("error")); } };
  const handleDialogClose = () => { setDialogOpen(false); setEditingItem(null); };

  if (isError) return <div className="p-4 text-center text-destructive">{tCommon("noData")}<Button variant="outline" onClick={() => refetch()} className="mt-4 ml-2 cursor-pointer">{tCommon("retry")}</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2><p className="text-sm text-muted-foreground">{t("description")}</p></div><Button onClick={handleCreate} className="cursor-pointer"><Plus className="mr-2 h-4 w-4" />{t("create")}</Button></div>
      <div className="flex flex-wrap items-center gap-4"><div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder={tCommon("search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" /></div></div>
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>{t("form.code")}</TableHead><TableHead>{t("form.name")}</TableHead><TableHead>{t("form.description")}</TableHead><TableHead>{t("form.isActive")}</TableHead><TableHead className="w-[100px]">{tCommon("actions")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-48" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-8 w-8" /></TableCell></TableRow>))
            : items.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>
            : items.map((item) => (<TableRow key={item.id}><TableCell className="font-mono text-sm">{item.code}</TableCell><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-muted-foreground">{item.description ?? "-"}</TableCell><TableCell><div className="flex items-center gap-2"><Switch checked={item.is_active} onCheckedChange={() => handleStatusChange(item.id, item.is_active, item.name)} disabled={updateMutation.isPending} className="cursor-pointer" /><span className="text-sm text-muted-foreground">{item.is_active ? tCommon("active") : tCommon("inactive")}</span></div></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleEdit(item)} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />{tCommon("edit")}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setDeleteId(item.id)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />{tCommon("delete")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}
          </TableBody>
        </Table>
      </div>
      {pagination && pagination.total_pages > 1 && <div className="flex justify-center"><Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>{Array.from({ length: Math.min(5, pagination.total_pages) }).map((_, i) => (<PaginationItem key={i + 1}><PaginationLink onClick={() => setPage(i + 1)} isActive={page === i + 1} className="cursor-pointer">{i + 1}</PaginationLink></PaginationItem>))}<PaginationItem><PaginationNext onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} className={page >= pagination.total_pages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem></PaginationContent></Pagination></div>}
      <SOSourceDialog open={dialogOpen} onOpenChange={handleDialogClose} editingItem={editingItem} />
      <DeleteDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} itemName="SO source" isLoading={deleteMutation.isPending} />
    </div>
  );
}
