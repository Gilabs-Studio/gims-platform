"use client";

import { useState } from "react";
import { Edit, Trash2, Plus, Search, Eye, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserList } from "../hooks/use-user-list";
import { UserForm } from "./user-form";
import { UserDetailModal } from "./user-detail-modal";
import { UserListMobileFilters } from "./user-list-mobile-filters";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User } from "../types";
import { useTranslations } from "next-intl";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";

export function UserList() {
  const {
    page,
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
  } = useUserList();

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations("userManagement.list");
  
  // Permission checks
  const hasCreatePermission = useHasPermission("CREATE_USERS");
  const hasEditPermission = useHasPermission("EDIT_USERS");
  const hasDeletePermission = useHasPermission("DELETE_USERS");
  
  // Check if any filters are active
  const hasActiveFilters = status !== "" || roleId !== "";

  const getAvatarUrl = (user: User) => {
    if (user.avatar_url) {
      return user.avatar_url;
    }
    // Always use dicebear with email as seed
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email)}`;
  };

  const handleViewUser = (userId: string) => {
    setViewingUserId(userId);
    setIsDetailModalOpen(true);
  };

  const columns: Column<User>[] = [
    {
      id: "name",
      header: t("name"),
      accessor: (row) => (
        <button
          onClick={() => handleViewUser(row.id)}
          className="flex items-center gap-3 font-medium text-primary hover:underline"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={getAvatarUrl(row)} alt={row.name} />
          </Avatar>
          <span>{row.name}</span>
        </button>
      ),
      className: "w-[200px]",
    },
    {
      id: "email",
      header: t("email"),
      accessor: (row) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      id: "role",
      header: t("role"),
      accessor: (row) => (
        <Badge variant="outline" className="font-normal">
          {row.role?.name || "N/A"}
        </Badge>
      ),
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => (
        <Badge variant={row.status === "active" ? "active" : "inactive"}>
          {row.status}
        </Badge>
      ),
      className: "w-[100px]",
    },
    {
      id: "actions",
      header: t("actions"),
      accessor: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            title="View Details"
            onClick={() => handleViewUser(row.id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {hasEditPermission && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditingUser(row.id)}
              className="h-8 w-8"
              title="Edit"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {hasDeletePermission && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDeleteClick(row.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
      className: "w-[140px] text-right",
    },
  ];

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setRoleId("");
    setPage(1);
    if (isMobile) {
      setIsFilterSheetOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      {isMobile ? (
        // Mobile Layout
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          {/* Action Buttons Row */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex-1 h-9"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t("filterTitle")}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {[status, roleId].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {hasCreatePermission && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        // Desktop Layout
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select 
              value={status || "all"} 
              onValueChange={(value) => setStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t("allStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus")}</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={roleId || "all"} 
              onValueChange={(value) => setRoleId(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[140px] h-9">
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
          {hasCreatePermission && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("addUser")}
            </Button>
          )}
        </div>
      )}

      {/* Mobile Filter Drawer */}
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage={t("empty")}
        pagination={
          pagination
            ? {
                page: pagination.page,
                per_page: pagination.per_page,
                total: pagination.total,
                total_pages: pagination.total_pages,
                has_next: pagination.has_next,
                has_prev: pagination.has_prev,
              }
            : undefined
        }
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        perPageOptions={[10, 20, 50, 100]}
        onResetFilters={handleResetFilters}
        mobileLayout={{
          titleColumn: "name",
          grid2: {
            type: "grid2",
            columns: ["role", "status"],
          },
        }}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
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

      {/* Edit Dialog */}
      {editingUser && editingUserData?.data && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
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

      {/* User Detail Modal */}
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

      {/* Delete Dialog */}
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
                name:
                  users.find((u) => u.id === deletingUserId)?.name ??
                  t("deleteDescription"),
              })
            : t("deleteDescription")
        }
        itemName="user"
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}
