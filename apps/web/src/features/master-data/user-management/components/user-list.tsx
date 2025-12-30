"use client";

import { useState } from "react";
import { Edit, Trash2, Plus, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useUserList } from "../hooks/use-user-list";
import { UserForm } from "./user-form";
import { UserDetailModal } from "./user-detail-modal";
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
    setLimit,
    search,
    setSearch,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingUser,
    setEditingUser,
    users,
    pagination,
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

  const [viewingUserId, setViewingUserId] = useState<number | string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations("userManagement.list");
  
  // Permission checks
  const hasCreatePermission = useHasPermission("CREATE_USERS");
  const hasEditPermission = useHasPermission("EDIT_USERS");
  const hasDeletePermission = useHasPermission("DELETE_USERS");

  // Transform users to ensure id is string for DataTable compatibility
  const transformedUsers = users.map(user => ({
    ...user,
    id: String(user.id),
  }));

  const getAvatarUrl = (user: User) => {
    if (user.photo_profile) {
      return user.photo_profile;
    }
    // Always use dicebear with username as seed
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.username)}`;
  };

  const handleViewUser = (userId: number | string) => {
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
          className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer"
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
      id: "username",
      header: "Username",
      accessor: (row) => (
        <span className="text-muted-foreground">{row.username ?? "N/A"}</span>
      ),
    },
    {
      id: "role",
      header: t("role"),
      accessor: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles && row.roles.length > 0 ? (
            row.roles.map((role) => (
              <Badge key={role.id} variant="outline" className="font-normal">
                {role.name}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              N/A
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => (
        <Badge variant={row.is_active ? "active" : "inactive"}>
          {row.is_active ? "Active" : "Inactive"}
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
            className="h-8 w-8 cursor-pointer"
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
              className="h-8 w-8 cursor-pointer"
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
              className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
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
    setPage(1);
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
            {hasCreatePermission && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="h-9 px-3 cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addUser")}
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
          </div>
          {hasCreatePermission && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              {t("addUser")}
            </Button>
          )}
        </div>
      )}


      {/* Table */}
      <DataTable
        columns={columns}
        data={transformedUsers}
        isLoading={isLoading}
        emptyMessage={t("empty")}
        pagination={pagination ? {
          page: pagination.page,
          per_page: pagination.limit,
          total: pagination.total,
          total_pages: Math.ceil(pagination.total / pagination.limit),
          has_next: pagination.page < Math.ceil(pagination.total / pagination.limit),
          has_prev: pagination.page > 1,
        } : undefined}
        onPageChange={setPage}
        onPerPageChange={setLimit}
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
