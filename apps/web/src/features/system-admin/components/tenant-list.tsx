"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion/page-motion";
import { useRecoverTenantDeletion, useTenants } from "../hooks/use-tenants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Search, Eye, RefreshCw, Users } from "lucide-react";
import { TenantDetailDialog } from "./tenant-detail-dialog";
import type { Tenant } from "../types";

export function TenantList() {
  const t = useTranslations("systemAdmin.tenants");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const recoverMutation = useRecoverTenantDeletion();

  const { data, isLoading, isError } = useTenants({ page, per_page: perPage, search: search || undefined });

  const tenants = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  if (isError) {
    return (
      <PageMotion>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {t("failedToLoad")}
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          {pagination && (
            <span className="text-sm text-muted-foreground">
              {pagination.total} {t("total")}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
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
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("slug")}</TableHead>
                <TableHead>{t("plan")}</TableHead>
                <TableHead>{t("users")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t("noTenants")}
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {tenant.slug}
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={tenant.plan} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span
                          className={
                            tenant.current_users >= tenant.max_users
                              ? "text-destructive font-medium"
                              : "text-foreground"
                          }
                        >
                          {tenant.current_users}
                        </span>
                        <span className="text-muted-foreground">/ {tenant.max_users}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <StatusBadge status={tenant.status} />
                        {tenant.status === "pending_deletion" && tenant.deletion_scheduled_at && (
                          <p className="text-[11px] text-muted-foreground">
                            {t("scheduledDelete", {
                              date: new Date(tenant.deletion_scheduled_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }),
                            })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => setViewingTenant(tenant)}
                          title={t("viewDetail")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {tenant.status === "pending_deletion" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            title={t("recoverAction")}
                            disabled={recoverMutation.isPending}
                            onClick={() => recoverMutation.mutate(tenant.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
            onPageSizeChange={(size) => {
              setPerPage(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Tenant Detail Dialog */}
      <TenantDetailDialog
        tenant={viewingTenant}
        open={!!viewingTenant}
        onClose={() => setViewingTenant(null)}
      />
    </PageMotion>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trial: "secondary",
    suspended: "destructive",
    pending_deletion: "destructive",
  };
  return (
    <Badge variant={variantMap[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    enterprise: "default",
    professional: "secondary",
    starter: "outline",
    free: "outline",
  };
  return (
    <Badge variant={variantMap[plan] ?? "outline"} className="capitalize">
      {plan}
    </Badge>
  );
}
