"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import {
  useLoyaltyPrograms,
  useDeleteLoyaltyProgram,
  useToggleLoyaltyProgram,
} from "../hooks/use-loyalty";
import type { LoyaltyProgram } from "../types";
import { LoyaltyProgramFormDialog } from "./loyalty-program-form-dialog";

export function LoyaltyProgramList() {
  const t = useTranslations("loyalty");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyProgram | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // hook params do not accept `search` in the current type; keep pagination only
  const { data, isLoading } = useLoyaltyPrograms({ page, per_page: perPage });
  const deleteMutation = useDeleteLoyaltyProgram();
  const toggleMutation = useToggleLoyaltyProgram();

  const programs = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  function handleEdit(program: LoyaltyProgram) {
    setEditing(program);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success(t("programs.deleted"));
    } catch {
      toast.error(t("programs.deleted") + " failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(id: string, name: string) {
    try {
      await toggleMutation.mutateAsync(id);
      toast.success(t("programs.updated") + ` - ${name}`);
    } catch {
      toast.error(t("programs.updated") + " failed");
    }
  }

  const getMembersCount = (program: LoyaltyProgram): number => {
    return program.member_count ?? program.members_count ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("programs.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage and configure customer loyalty programs
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {t("programs.create")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") || "Search..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("programs.form.name")}</TableHead>
              <TableHead>{t("programs.form.outlet")}</TableHead>
              <TableHead>{t("programs.form.isActive")}</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("programs.empty")}
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {program.outlet_id ? t("programs.outletSpecific") : t("programs.global")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={program.is_active}
                        onCheckedChange={(checked) => {
                          if (checked !== program.is_active) {
                            void handleToggle(program.id, program.name);
                          }
                        }}
                        disabled={toggleMutation.isPending}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {program.is_active ? t("programs.active") : t("programs.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal tabular-nums">
                      {getMembersCount(program).toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(program)} className="cursor-pointer">
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("programs.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingId(program.id)} className="cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("programs.delete")}
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
            setPerPage(newSize);
            setPage(1);
          }}
        />
      )}

      <LoyaltyProgramFormDialog
        open={formOpen}
        onClose={handleCloseForm}
        program={editing}
      />

      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
