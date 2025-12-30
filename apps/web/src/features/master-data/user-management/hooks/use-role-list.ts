"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  useRoles,
  useDeleteRole,
  useCreateRole,
  useUpdateRole,
  useRole,
} from "./use-roles";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";

export function useRoleList() {
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data, isLoading } = useRoles();
  const deleteRole = useDeleteRole();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const roles = data?.data || [];
  const { data: editingRoleData } = useRole(editingRole || "");
  const roleForEdit = editingRoleData;

  const handleCreate = useCallback(async (formData: CreateRoleFormData) => {
    try {
      await createRole.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Role created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createRole]);

  const handleUpdate = useCallback(async (formData: UpdateRoleFormData) => {
    if (editingRole) {
      try {
        await updateRole.mutateAsync({ id: editingRole, data: formData });
        setEditingRole(null);
        toast.success("Role updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingRole, updateRole]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRole.mutateAsync(id);
      toast.success("Role deleted successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [deleteRole]);

  return {
    // State
    editingRole,
    setEditingRole,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    // Data
    roles,
    roleForEdit,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    // Mutations
    deleteRole,
    createRole,
    updateRole,
  };
}
