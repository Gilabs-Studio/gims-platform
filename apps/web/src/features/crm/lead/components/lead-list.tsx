"use client";

import { MoreHorizontal, Plus, Search, Pencil, Trash2, ArrowRightLeft, Filter, Eye, Zap, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadFormDialog } from "./lead-form-dialog";
import { LeadConvertDialog } from "./lead-convert-dialog";
import { LeadAnalytics } from "./lead-analytics";
import { GenerateLeadsDialog } from "./generate-leads-dialog";
import { useLeadList } from "../hooks/use-lead-list";
import { useLeadFormData, useUpdateLead } from "../hooks/use-leads";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";

export function LeadList() {
  const { state, actions, data, permissions, translations } = useLeadList();
  const { t, tCommon } = translations;
  const { data: formData } = useLeadFormData();
  const router = useRouter();
  const updateMutation = useUpdateLead();
  const [generateOpen, setGenerateOpen] = useState(false);

  const leadSources = formData?.data?.lead_sources ?? [];
  const leadStatuses = formData?.data?.lead_statuses ?? [];

  const handleStatusChange = async (leadId: string, statusId: string) => {
    try {
      await updateMutation.mutateAsync({ id: leadId, data: { lead_status_id: statusId } });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button variant="outline" onClick={() => data.refetch()} className="mt-4 ml-2 cursor-pointer">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canCreate && (
            <Button variant="outline" onClick={() => setGenerateOpen(true)} className="cursor-pointer">
              <Zap className="mr-2 h-4 w-4" />
              {t("generate.buttonLabel")}
            </Button>
          )}
          {permissions.canCreate && (
            <Button onClick={actions.handleCreate} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              {t("addLead")}
            </Button>
          )}
        </div>
      </div>

      {/* Analytics */}
      <LeadAnalytics />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={state.statusFilter}
          onValueChange={(value) => {
            actions.setStatusFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allStatuses")}</SelectItem>
            {leadStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id} className="cursor-pointer">
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state.sourceFilter}
          onValueChange={(value) => {
            actions.setSourceFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allSources")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allSources")}</SelectItem>
            {leadSources.map((source) => (
              <SelectItem key={source.id} value={source.id} className="cursor-pointer">
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.code")}</TableHead>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.company")}</TableHead>
              <TableHead>{t("table.source")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.score")}</TableHead>
              <TableHead className="text-right">{t("table.value")}</TableHead>
              <TableHead>{t("table.assignedTo")}</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete || permissions.canConvert) && (
                <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete || permissions.canConvert) && (
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  )}
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={(permissions.canUpdate || permissions.canDelete || permissions.canConvert) ? 10 : 9}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyState")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => {
                const isConverted = !!item.customer_id;
                const statusColor = item.lead_status?.color ?? undefined;

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/crm/leads/${item.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {item.first_name} {item.last_name}
                        </span>
                        {item.place_id && item.place_id.startsWith("http") && (
                          <a
                            href={item.place_id}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline w-fit"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.lead_source?.name === "LinkedIn" || item.lead_source?.name === "LinkedIn Scraping"
                              ? "View LinkedIn Profile"
                              : item.lead_source?.name === "Google Maps" || item.lead_source?.name === "Google Maps Scraping"
                              ? "View on Google Maps"
                              : t("form.visitLink") || "Visit Source Link"}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.company_name || "-"}</TableCell>
                    <TableCell>{item.lead_source?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={statusColor ? { borderColor: statusColor, color: statusColor } : undefined}
                      >
                        {item.lead_status?.name ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.lead_score}</TableCell>
                    <TableCell className="text-right">
                      {item.estimated_value ? formatCurrency(item.estimated_value) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.assigned_employee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(item.assigned_employee.employee_code)}`}
                              alt={item.assigned_employee.name}
                            />
                            <AvatarFallback dataSeed={item.assigned_employee.employee_code} className="text-xs">
                              {item.assigned_employee.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[120px]" title={item.assigned_employee.name}>
                            {item.assigned_employee.name}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(item.created_at)}
                    </TableCell>
                    {(permissions.canUpdate || permissions.canDelete || permissions.canConvert) && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/crm/leads/${item.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("detailTitle")}
                            </DropdownMenuItem>
                            {permissions.canUpdate && !isConverted && (
                              <DropdownMenuItem onClick={() => actions.handleEdit(item)} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" />
                                {tCommon("edit")}
                              </DropdownMenuItem>
                            )}
                            {permissions.canConvert && !isConverted && (
                              <DropdownMenuItem onClick={() => actions.handleConvert(item)} className="cursor-pointer">
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                {t("convertTitle")}
                              </DropdownMenuItem>
                            )}
                            {permissions.canUpdate && !isConverted && leadStatuses.length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="cursor-pointer">
                                  <ChevronRight className="mr-2 h-4 w-4" />
                                  {t("changeStatus")}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {leadStatuses
                                    .slice()
                                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                    .map((status) => {
                                      const isCurrent = item.lead_status_id === status.id;
                                      return (
                                        <DropdownMenuItem
                                          key={status.id}
                                          disabled={isCurrent || updateMutation.isPending}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(item.id, status.id);
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <span
                                            className="mr-2 h-2 w-2 rounded-full shrink-0 inline-block"
                                            style={{ backgroundColor: status.color ?? "#888" }}
                                          />
                                          {status.name}
                                          {isCurrent && (
                                            <span className="ml-auto text-xs text-muted-foreground">✓</span>
                                          )}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                            {(permissions.canUpdate || permissions.canConvert) && permissions.canDelete && !isConverted && (
                              <DropdownMenuSeparator />
                            )}
                            {permissions.canDelete && !isConverted && (
                              <DropdownMenuItem
                                onClick={() => actions.setDeleteId(item.id)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            )}
                            {isConverted && (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                {t("convertedBadge")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

      {/* Dialogs */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <LeadFormDialog
          open={state.dialogOpen}
          onClose={actions.handleDialogClose}
          lead={state.editingItem}
        />
      )}

      {permissions.canConvert && state.convertItem && (
        <LeadConvertDialog
          open={!!state.convertItem}
          onClose={actions.handleConvertClose}
          lead={state.convertItem}
        />
      )}

      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
          onConfirm={actions.handleDelete}
          itemName="lead"
          isLoading={data.isDeleting}
        />
      )}

      {permissions.canCreate && (
        <GenerateLeadsDialog
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          onSuccess={() => {
            setGenerateOpen(false);
            data.refetch();
          }}
        />
      )}
    </div>
  );
}
