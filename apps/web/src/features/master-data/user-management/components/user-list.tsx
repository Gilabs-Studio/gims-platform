"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, SlidersHorizontal, KeyRound, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserList } from "../hooks/use-user-list";
import type { User } from "../types";
import { UserDetailModal } from "./user-detail-modal";
import { UserForm } from "./user-form";
import { UserListMobileFilters } from "./user-list-mobile-filters";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";
import { passwordResetService } from "@/features/auth/password-reset/services/password-reset-service";
import {
  clearPasswordResetTokenPrefill,
  getPasswordResetTokenPrefill,
} from "@/lib/password-reset-token-prefill";

function getInitialOpenUserFromURL(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("open_user");
}

export function UserList() {
  const {
    setPage,
    setPerPage,
    search,
    setSearch,
    status,
    setStatus,
    roleId,
    setRoleId,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingUser,
    setEditingUser,
    users,
    pagination,
    roles,
    editingUserData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    deletingUserId,
    setDeletingUserId,
    deleteUser,
    createUser,
    updateUser,
    permissions,
  } = useUserList();

  const [viewingUserId, setViewingUserId] = useState<string | null>(getInitialOpenUserFromURL);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(() => getInitialOpenUserFromURL() !== null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isMobile = useIsMobile();
  const t = useTranslations("userManagement.list");
  const queryClient = useQueryClient();

  // Check if any filters are active
  const hasActiveFilters = status !== "" || roleId !== "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.get("open_user")) {
      return;
    }

    searchParams.delete("open_user");
    const nextQuery = searchParams.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextURL);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenChangePassword = searchParams.get("open_change_password") === "1";
    const resetUserId = searchParams.get("reset_user");

    if (!shouldOpenChangePassword || !resetUserId || users.length === 0) {
      return;
    }

    const targetUser = users.find((user) => user.id === resetUserId);
    if (!targetUser) {
      return;
    }

    const payload = getPasswordResetTokenPrefill();
    setResetPasswordTarget(targetUser);
    setResetToken(payload?.userId === resetUserId ? payload.token : "");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    clearPasswordResetTokenPrefill();

    searchParams.delete("open_change_password");
    searchParams.delete("reset_user");
    const nextQuery = searchParams.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextURL);
  }, [users]);

  const getAvatarUrl = (user: User) => {
    if (user.avatar_url) {
      return user.avatar_url;
    }

    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email)}`;
  };

  const handleViewUser = (userId: string) => {
    setViewingUserId(userId);
    setIsDetailModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setRoleId("");
    setPage(1);
    if (isMobile) {
      setIsFilterSheetOpen(false);
    }
  };

  const openResetPasswordDialog = (user: User) => {
    setResetPasswordTarget(user);
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const closeResetPasswordDialog = () => {
    setResetPasswordTarget(null);
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsSubmittingReset(false);
  };

  const handleSubmitResetPassword = async () => {
    if (!resetPasswordTarget) {
      return;
    }

    if (!resetToken.trim()) {
      toast.error(t("resetPasswordTokenRequired"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("resetPasswordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("resetPasswordNotMatch"));
      return;
    }

    try {
      setIsSubmittingReset(true);
      await passwordResetService.resetPassword({
        token: resetToken.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("resetPasswordSuccessWithName", { name: resetPasswordTarget.name }));
      closeResetPasswordDialog();
    } catch {
      toast.error(t("resetPasswordFailed"));
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      {isMobile ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFilterSheetOpen(true)}
              className="h-9 flex-1 cursor-pointer"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t("filterTitle")}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {[status, roleId].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {permissions.canCreate && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="h-9 px-3 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-10"
              />
            </div>
            <Select
              value={status || "all"}
              onValueChange={(value) => setStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder={t("allStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus")}</SelectItem>
                <SelectItem value="active">{t("active")}</SelectItem>
                <SelectItem value="inactive">{t("inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roleId || "all"}
              onValueChange={(value) => setRoleId(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder={t("allRoles")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allRoles")}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {permissions.canCreate && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="cursor-pointer" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("addUser")}
            </Button>
          )}
        </div>
      )}

      {isMobile && (
        <UserListMobileFilters
          open={isFilterSheetOpen}
          onOpenChange={setIsFilterSheetOpen}
          status={status}
          roleId={roleId}
          roles={roles}
          onStatusChange={(value) => setStatus(value === "all" ? "" : value)}
          onRoleChange={(value) => setRoleId(value === "all" ? "" : value)}
          onReset={handleResetFilters}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && (
                <TableHead className="w-20 text-right">{t("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-8 w-44" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  )}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={permissions.canUpdate || permissions.canDelete ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.password_reset_pending ? "bg-destructive/10 hover:bg-destructive/15" : undefined}
                >
                  <TableCell>
                    <button
                      onClick={() => handleViewUser(row.id)}
                      className="group flex items-center gap-3 cursor-pointer"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(row)} alt={row.name} />
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-primary group-hover:underline">{row.name}</span>
                        {row.password_reset_pending && (
                          <span className="text-xs font-medium text-destructive">
                            {t("pendingResetRequest")}
                          </span>
                        )}
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {row.role?.name ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.status === "active"}
                        onCheckedChange={(checked) => {
                          const newStatus = checked ? "active" : "inactive";
                          updateUser.mutate(
                            { id: row.id, data: { status: newStatus } },
                            {
                              onSuccess: () => {
                                toast.success(`User status updated to ${newStatus}`);
                              },
                              onError: () => {
                                toast.error("Failed to update user status");
                              },
                            },
                          );
                        }}
                        disabled={!permissions.canUpdate || updateUser.isPending}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {row.status === "active" ? t("active") : t("inactive")}
                      </span>
                    </div>
                  </TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewUser(row.id)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {permissions.canUpdate && (
                            <DropdownMenuItem
                              onClick={() => setEditingUser(row.id)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {permissions.canUpdate && row.password_reset_pending && (
                            <DropdownMenuItem
                              onClick={() => openResetPasswordDialog(row)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              {t("resetPasswordAction")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (permissions.canUpdate || row.password_reset_pending) && <DropdownMenuSeparator />}
                          {permissions.canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(row.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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
          onPageSizeChange={(newSize) => {
            setPerPage(newSize);
            setPage(1);
          }}
        />
      )}

      {(permissions.canCreate || permissions.canUpdate) && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("createTitle")}</DialogTitle>
            </DialogHeader>
            <UserForm
              onSubmit={async (data) => {
                await handleCreate(data as CreateUserFormData);
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createUser.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {editingUser && editingUserData?.data && permissions.canUpdate && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <UserForm
              user={editingUserData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdateUserFormData);
              }}
              onCancel={() => setEditingUser(null)}
              isLoading={updateUser.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!resetPasswordTarget} onOpenChange={(open) => !open && closeResetPasswordDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("resetPasswordDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("resetPasswordDialogDescription", { name: resetPasswordTarget?.name ?? "-" })}
            </p>
            <div className="space-y-2">
              <label htmlFor="reset-token" className="text-sm font-medium">
                {t("resetPasswordTokenLabel")}
              </label>
              <Input
                id="reset-token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder={t("resetPasswordTokenPlaceholder")}
                disabled={isSubmittingReset}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                {t("resetPasswordNewLabel")}
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("resetPasswordNewPlaceholder")}
                  disabled={isSubmittingReset}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={isSubmittingReset}
                  aria-label={showNewPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                {t("resetPasswordConfirmLabel")}
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("resetPasswordConfirmPlaceholder")}
                  disabled={isSubmittingReset}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isSubmittingReset}
                  aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeResetPasswordDialog} disabled={isSubmittingReset} className="cursor-pointer">
                {t("cancelResetPassword")}
              </Button>
              <Button onClick={handleSubmitResetPassword} disabled={isSubmittingReset} className="cursor-pointer">
                {isSubmittingReset ? t("resetPasswordSubmitting") : t("resetPasswordSubmit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UserDetailModal
        userId={viewingUserId}
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) {
            setViewingUserId(null);
          }
        }}
        onUserUpdated={() => {
          // Refresh will be handled by query invalidation in hooks
        }}
      />

      {permissions.canDelete && (
        <DeleteDialog
          open={!!deletingUserId}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingUserId(null);
            }
          }}
          onConfirm={handleDeleteConfirm}
          title={t("deleteTitle")}
          description={
            deletingUserId
              ? t("deleteDescriptionWithName", {
                  name: users.find((u) => u.id === deletingUserId)?.name ?? t("deleteDescription"),
                })
              : t("deleteDescription")
          }
          itemName="user"
          isLoading={deleteUser.isPending}
        />
      )}
    </div>
  );
}
