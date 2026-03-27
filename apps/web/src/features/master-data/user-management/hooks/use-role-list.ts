"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useRoles,
  useDeleteRole,
  useCreateRole,
  useUpdateRole,
  useRole,
} from "./use-roles";
import { useDebounce } from "@/hooks/use-debounce";
import { useHasPermission } from "./use-has-permission";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";

export function useRoleList() {
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [assigningPermissions, setAssigningPermissions] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  // Permission checks
  const canCreate = useHasPermission("role.create");
  const canUpdate = useHasPermission("role.update");
  const canDelete = useHasPermission("role.delete");
  const canAssignPermissions = useHasPermission("role.assign_permissions");

  const { data, isLoading } = useRoles({ search: debouncedSearch });
  const deleteRole = useDeleteRole();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const roles = data?.data || [];
  const { data: editingRoleData } = useRole(editingRole || "");
  const roleForEdit = editingRoleData;

  const handleCreate = async (formData: CreateRoleFormData) => {
    try {
      await createRole.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Role created successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleUpdate = async (formData: UpdateRoleFormData) => {
    if (editingRole) {
      try {
        await updateRole.mutateAsync({ id: editingRole, data: formData });
        setEditingRole(null);
        toast.success("Role updated successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRole.mutateAsync(id);
      toast.success("Role deleted successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  return {
    // State
    editingRole,
    setEditingRole,
    assigningPermissions,
    setAssigningPermissions,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    search,
    setSearch,
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
    // Permissions
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
      canAssignPermissions,
    }
  };
}
