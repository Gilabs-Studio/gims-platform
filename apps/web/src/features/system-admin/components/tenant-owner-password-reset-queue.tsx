"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion/page-motion";
import {
  useSystemAdminResetTenantOwnerPassword,
  useTenantOwnerPasswordResetQueue,
} from "../hooks/use-tenants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, KeyRound, Clock3 } from "lucide-react";
import type { TenantOwnerPasswordResetQueueItem } from "../types";

export function TenantOwnerPasswordResetQueue() {
  const t = useTranslations("systemAdmin.tenantOwnerReset");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedItem, setSelectedItem] = useState<TenantOwnerPasswordResetQueueItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetMutation = useSystemAdminResetTenantOwnerPassword();
  const { data, isLoading, isError } = useTenantOwnerPasswordResetQueue({
    page,
    per_page: perPage,
    search: search || undefined,
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const isPasswordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const openResetDialog = (item: TenantOwnerPasswordResetQueueItem) => {
    setSelectedItem(item);
    setNewPassword("");
    setConfirmPassword("");
    setIsDialogOpen(true);
  };

  const closeResetDialog = () => {
    if (resetMutation.isPending) {
      return;
    }
    setIsDialogOpen(false);
    setSelectedItem(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleResetPassword = async () => {
    if (!selectedItem) {
      return;
    }

    const autoToken = (selectedItem.reset_token ?? selectedItem.token ?? selectedItem.request_id).trim();
    const sanitizedPassword = newPassword.trim();
    const sanitizedConfirmPassword = confirmPassword.trim();
    if (!autoToken || !sanitizedPassword || !sanitizedConfirmPassword || sanitizedPassword !== sanitizedConfirmPassword) {
      return;
    }

    await resetMutation.mutateAsync({
      token: autoToken,
      new_password: sanitizedPassword,
      confirm_password: sanitizedConfirmPassword,
    });

    closeResetDialog();
  };

  if (isError) {
    return (
      <PageMotion>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{t("failedToLoad")}</div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("queueTitle")}</CardTitle>
            <CardDescription>{t("queueDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tenant")}</TableHead>
                    <TableHead>{t("owner")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("requestedAt")}</TableHead>
                    <TableHead>{t("expiresAt")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="w-40 text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: perPage }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-8 w-28" /></TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {t("empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow
                        key={item.request_id}
                        className="cursor-pointer"
                        onClick={() => openResetDialog(item)}
                      >
                        <TableCell className="font-medium">{item.tenant_name}</TableCell>
                        <TableCell>{item.user_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.user_email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.requested_at).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>{new Date(item.expires_at).toLocaleString("id-ID")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              openResetDialog(item);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                            {t("openResetDialog")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

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
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeResetDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>
                {selectedItem
                  ? t("dialogDescription", {
                      tenant: selectedItem.tenant_name,
                      owner: selectedItem.user_name,
                    })
                  : t("dialogDescriptionFallback")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("newPasswordLabel")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t("newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("confirmPasswordLabel")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {isPasswordMismatch && (
                  <p className="text-xs text-destructive">{t("passwordMismatch")}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeResetDialog} disabled={resetMutation.isPending}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={
                  resetMutation.isPending ||
                  !selectedItem ||
                  !newPassword.trim() ||
                  !confirmPassword.trim() ||
                  isPasswordMismatch
                }
                onClick={handleResetPassword}
              >
                <KeyRound className="h-4 w-4" />
                {resetMutation.isPending ? t("processing") : t("submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageMotion>
  );
}
