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
  useFinanceUpCountryCostList,
  useDeleteFinanceUpCountryCost,
  useApproveFinanceUpCountryCost,
} from "../hooks/use-finance-up-country-cost";
import type { UpCountryCost } from "../types";
import { UpCountryCostForm } from "./up-country-cost-form";

export function UpCountryCostList() {
  const t = useTranslations("financeUpCountryCost");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("up_country_cost.create");
  const canUpdate = useUserPermission("up_country_cost.update");
  const canDelete = useUserPermission("up_country_cost.delete");
  const canApprove = useUserPermission("up_country_cost.approve");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<UpCountryCost | null>(null);

  const { data, isLoading, isError } = useFinanceUpCountryCostList({
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteFinanceUpCountryCost();
  const approveMutation = useApproveFinanceUpCountryCost();

  const items = useMemo(() => data?.data ?? [], [data?.data]);

  const handleCreate = () => {
    setSelectedItem(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleEdit = (item: UpCountryCost) => {
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
              <TableHead>{t("fields.code")}</TableHead>
              <TableHead>{t("fields.purpose")}</TableHead>
              <TableHead>{t("fields.location")}</TableHead>
              <TableHead>{t("fields.startDate")}</TableHead>
              <TableHead>{t("fields.endDate")}</TableHead>
              <TableHead className="text-right">{t("fields.totalAmount")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>{item.purpose}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>{new Date(item.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(item.end_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.total_amount?.toLocaleString() ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "approved" ? "success" as any : "secondary"}>
                      {t(`status.${item.status}`)}
                    </Badge>
                  </TableCell>
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

      <UpCountryCostForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={selectedItem}
      />
    </div>
  );
}
