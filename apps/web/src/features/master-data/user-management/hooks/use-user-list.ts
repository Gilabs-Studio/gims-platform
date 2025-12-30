"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUsers, useDeleteUser, useUser, useCreateUser, useUpdateUser } from "./use-users";
import { useRoles } from "./use-users";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";

export function useUserList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<number | string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | string | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useUsers({ 
    page, 
    limit, 
    search: debouncedSearch, 
    searchBy: searchBy || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: rolesData } = useRoles();
  const { data: editingUserData } = useUser(editingUser || 0);
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const users = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const roles = rolesData?.data ?? [];
  const searchableColumns = data?.meta?.searchable_columns;
  const sortableColumns = data?.meta?.sortable_columns;

  const handleCreate = useCallback(async (formData: CreateUserFormData) => {
    try {
      await createUser.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("User created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createUser]);

  const handleUpdate = useCallback(async (formData: UpdateUserFormData) => {
    if (editingUser) {
      try {
        await updateUser.mutateAsync({ id: editingUser, data: formData });
        setEditingUser(null);
        toast.success("User updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingUser, updateUser]);

  const handleDeleteClick = useCallback((id: number | string) => {
    setDeletingUserId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingUserId) {
      try {
        await deleteUser.mutateAsync(deletingUserId);
        toast.success("User deleted successfully");
        setDeletingUserId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingUserId, deleteUser]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  return {
    // State
    page,
    setPage,
    limit,
    setLimit: handleLimitChange,
    search,
    setSearch,
    searchBy,
    setSearchBy,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
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
    searchableColumns,
    sortableColumns,
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
  };
}
