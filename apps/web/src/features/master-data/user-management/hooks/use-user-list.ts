"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUsers, useDeleteUser, useUser, useCreateUser, useUpdateUser } from "./use-users";
import { useRoles } from "./use-users";
import { useDebounce } from "@/hooks/use-debounce";
import { useHasPermission } from "./use-has-permission";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";

export function useUserList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [status, setStatus] = useState<string>("");
  const [roleId, setRoleId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Permission checks
  const canCreate = useHasPermission("user.create");
  const canUpdate = useHasPermission("user.update");
  const canDelete = useHasPermission("user.delete");

  const { data, isLoading } = useUsers({ page, per_page: perPage, search: debouncedSearch, status, role_id: roleId });
  const { data: rolesData } = useRoles();
  const { data: editingUserData } = useUser(editingUser || "");
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const users = data?.data || [];
  const pagination = data?.meta?.pagination;
  const roles = rolesData?.data || [];

  const handleCreate = async (formData: CreateUserFormData) => {
    try {
      await createUser.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("User created successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleUpdate = async (formData: UpdateUserFormData) => {
    if (editingUser) {
      try {
        await updateUser.mutateAsync({ id: editingUser, data: formData });
        setEditingUser(null);
        toast.success("User updated successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingUserId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deletingUserId) {
      try {
        await deleteUser.mutateAsync(deletingUserId);
        toast.success("User deleted successfully");
        setDeletingUserId(null);
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing per page
  };

  return {
    // State
    page,
    setPage,
    perPage,
    setPerPage: handlePerPageChange,
    search,
    setSearch: handleSearchChange,
    status,
    setStatus,
    roleId,
    setRoleId,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingUser,
    setEditingUser,
    deletingUserId,
    setDeletingUserId,
    // Data
    users,
    pagination,
    roles,
    editingUserData,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    // Mutations
    deleteUser,
    createUser,
    updateUser,
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
  };
}
