"use client";

import { useState } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";
import type { Role } from "../types";

export function RoleList() {
  const {
    editingRole,
    setEditingRole,
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
  } = useRoleList();
  
  const [deletingRoleId, setDeletingRoleId] = useState<number | string | null>(null);
  const t = useTranslations("userManagement.roleList");

  const columns: Column<Role>[] = [
    {
      id: "name",
      header: t("name"),
      accessor: (row) => (
        <span className="font-medium cursor-pointer">{row.name}</span>
      ),
      className: "w-[200px]",
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
      id: "actions",
      header: t("actions"),
      accessor: (row) => {
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditingRole(row.id)}
              className="h-8 w-8 cursor-pointer"
              title="Edit"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeletingRoleId(row.id);
              }}
              className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
      className: "w-[120px] text-right",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("addRole")}
        </Button>
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

      {/* Edit Dialog */}
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

      {/* Delete Dialog */}
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
    </div>
  );
}
