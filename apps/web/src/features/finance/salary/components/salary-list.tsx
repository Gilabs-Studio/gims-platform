"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useFinanceSalaryList,
  useDeleteFinanceSalary,
  useApproveFinanceSalary,
} from "../hooks/use-finance-salary";
import type { SalaryStructure } from "../types";
import { SalaryForm } from "./salary-form";

export function SalaryList() {
  const t = useTranslations("financeSalary");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("salary.create");
  const canUpdate = useUserPermission("salary.update");
  const canDelete = useUserPermission("salary.delete");
  const canApprove = useUserPermission("salary.approve");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<SalaryStructure | null>(null);

  const { data, isLoading, isError } = useFinanceSalaryList({
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteFinanceSalary();
  const approveMutation = useApproveFinanceSalary();

  const items = useMemo(() => data?.data ?? [], [data?.data]);

  const handleCreate = () => {
    setSelectedItem(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleEdit = (item: SalaryStructure) => {
    setSelectedItem(item);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("toast.approved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "draft": return "secondary";
      case "inactive": return "outline";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {tCommon("create")}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tCommon("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.employee")}</TableHead>
              <TableHead>{t("fields.effectiveDate")}</TableHead>
              <TableHead className="text-right">{t("fields.basicSalary")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead>{t("fields.notes")}</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.employee_id}</TableCell>
                  <TableCell>{new Date(item.effective_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.basic_salary.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status) as any}>
                      {t(`status.${item.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.notes}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && item.status === "draft" && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(item)}>
                            {tCommon("edit")}
                          </DropdownMenuItem>
                        )}
                        {canApprove && item.status === "draft" && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleApprove(item.id)}>
                            {t("actions.approve")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && item.status === "draft" && (
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => handleDelete(item.id)}>
                            {tCommon("delete")}
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

      <SalaryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={selectedItem}
      />
    </div>
  );
}
