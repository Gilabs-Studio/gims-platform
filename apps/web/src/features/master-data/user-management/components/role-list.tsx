"use client";

import { useState } from "react";
import { Edit, Trash2, Plus, Settings, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useRoleList } from "../hooks/use-role-list";
import { RoleForm } from "./role-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssignPermissionsDialog } from "./assign-permissions-dialog";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";
import type { Role } from "../types";

export function RoleList() {
  const {
    editingRole,
    setEditingRole,
    assigningPermissions,
    setAssigningPermissions,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    roles,

    roleForEdit,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDelete,
    deleteRole,
    createRole,
    updateRole,
    search,
    setSearch,
    permissions,
  } = useRoleList();
  
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const t = useTranslations("userManagement.roleList");

  const columns: Column<Role>[] = [
    {
      id: "name",
      header: t("name"),
      accessor: (row) => (
        <span className="font-medium">{row.name}</span>
      ),
      className: "w-[200px]",
    },
    {
      id: "code",
      header: t("code"),
      accessor: (row) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.code}
        </code>
      ),
    },
    {
      id: "description",
      header: t("description"),
      accessor: (row) => (
        <span className="text-muted-foreground">
          {row.description || "-"}
        </span>
      ),
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => {
        // Check if role is protected
        const isProtected = (row.is_protected ?? false) || row.code === "admin" || row.code === "superadmin";
        
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.status === "active"}
              onCheckedChange={(checked) => {
                const newStatus = checked ? "active" : "inactive";
                updateRole.mutate(
                  { id: row.id, data: { status: newStatus } },
                  {
                    onSuccess: () => {
                      toast.success(`Role status updated to ${newStatus}`);
                    },
                    onError: () => {
                      toast.error("Failed to update role status");
                    }
                  }
                );
              }}
              disabled={isProtected || updateRole.isPending || !permissions.canUpdate}
              className="cursor-pointer"
              title={isProtected ? "Protected role status cannot be changed" : ""}
            />
            <span className="text-sm text-muted-foreground">
              {row.status === "active" ? t("active") : t("inactive")}
            </span>
          </div>
        );
      },
      className: "w-[150px]",
    },
    {
      id: "permissions",
      header: t("permissions"),
      accessor: (row) => (
        <Badge variant="outline" className="font-normal">
          {row.permissions?.length || 0}
        </Badge>
      ),
      className: "w-[120px]",
    },
    {
      id: "actions",
      header: t("actions"),
      accessor: (row) => {
        // Check if role is protected - either by is_protected flag or by code (admin/superadmin)
        const isProtected = (row.is_protected ?? false) || row.code === "admin" || row.code === "superadmin";
        
        return (
          <div className="flex items-center justify-end gap-1">
            {permissions.canUpdate && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (!isProtected) {
                    setEditingRole(row.id);
                  }
                }}
                disabled={isProtected}
                className={isProtected 
                  ? "h-8 w-8 cursor-not-allowed opacity-50 pointer-events-none" 
                  : "h-8 w-8"
                }
                title={isProtected ? "This role is protected and cannot be edited" : "Edit"}
                aria-disabled={isProtected}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {permissions.canAssignPermissions && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setAssigningPermissions(row.id)}
                className="h-8 w-8"
                aria-label={t("assignPermissionsTitle")}
                title="Assign Permissions"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {permissions.canDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isProtected) {
                    setDeletingRoleId(row.id);
                  }
                }}
                disabled={isProtected}
                className={isProtected 
                  ? "h-8 w-8 cursor-not-allowed opacity-50 pointer-events-none" 
                  : "h-8 w-8 text-destructive hover:text-destructive"
                }
                title={isProtected ? "This role is protected and cannot be deleted" : "Delete"}
                aria-disabled={isProtected}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
      className: "w-[120px] text-right",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        
        {permissions.canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("addRole")}
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        emptyMessage={t("empty")}
        mobileLayout={{
          titleColumn: "name",
          grid2: {
            type: "grid2",
            columns: ["status", "permissions"],
          },
        }}
      />

      {/* Create Dialog */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
            </DialogHeader>
            <RoleForm
              onSubmit={async (data) => {
                await handleCreate(data as CreateRoleFormData);
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createRole.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {(permissions.canUpdate) && (
        <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
            </DialogHeader>
            {roleForEdit ? (
              <RoleForm
                role={roleForEdit}
                onSubmit={async (data) => {
                  await handleUpdate(data as UpdateRoleFormData);
                }}
                onCancel={() => setEditingRole(null)}
                isLoading={updateRole.isPending}
              />
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Loading role data...
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Permissions Dialog */}
      {assigningPermissions && (permissions.canAssignPermissions) && (
        <AssignPermissionsDialog
          roleId={assigningPermissions}
          onClose={() => setAssigningPermissions(null)}
        />
      )}

      {/* Delete Dialog */}
      {permissions.canDelete && (
        <DeleteDialog
          open={!!deletingRoleId}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingRoleId(null);
            }
          }}
          onConfirm={async () => {
            if (deletingRoleId) {
              await handleDelete(deletingRoleId);
              setDeletingRoleId(null);
            }
          }}
          title={t("deleteTitle")}
          description={
            deletingRoleId
              ? t("deleteDescriptionWithName", {
                  name: roles.find((r) => r.id === deletingRoleId)?.name ?? t("deleteDescription"),
                })
              : t("deleteDescription")
          }
          itemName="role"
          isLoading={deleteRole.isPending}
        />
      )}
    </div>
  );
}
