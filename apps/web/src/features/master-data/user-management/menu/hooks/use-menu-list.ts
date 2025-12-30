"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useMenus,
  useDeleteMenu,
  useMenu,
  useCreateMenu,
  useUpdateMenu,
} from "./use-menus";
import type { CreateMenuFormData, UpdateMenuFormData } from "../schemas/menu.schema";

export function useMenuList() {
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<number | null>(null);
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  // Fetch all menus for tree view (use high limit to get all)
  const { data, isLoading } = useMenus({
    page: 1,
    limit: 1000, // Fetch all menus for tree building
    search: debouncedSearch,
    sort_by: "order_no",
    sort_order: "asc",
  });
  const { data: editingMenuData } = useMenu(editingMenu);
  const deleteMenu = useDeleteMenu();
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();

  const menus = data?.data || [];

  // Debug logging
  console.log("[useMenuList] isLoading:", isLoading);
  console.log("[useMenuList] API Response:", data);
  console.log("[useMenuList] Menus count:", menus.length);
  if (menus.length > 0) {
    console.log("[useMenuList] First menu:", menus[0]);
  }

  const handleCreate = useCallback(
    async (formData: CreateMenuFormData) => {
      try {
        await createMenu.mutateAsync(formData);
        setIsCreateDialogOpen(false);
        toast.success("Menu created successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    },
    [createMenu]
  );

  const handleUpdate = useCallback(
    async (formData: UpdateMenuFormData) => {
      if (editingMenu) {
        try {
          await updateMenu.mutateAsync({ id: editingMenu, data: formData });
          setEditingMenu(null);
          toast.success("Menu updated successfully");
        } catch {
          // Error already handled in api-client interceptor
        }
      }
    },
    [editingMenu, updateMenu]
  );

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingMenuId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingMenuId) {
      try {
        await deleteMenu.mutateAsync(deletingMenuId);
        toast.success("Menu deleted successfully");
        setDeletingMenuId(null);
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingMenuId, deleteMenu]);

  return {
    // State
    search,
    isCreateDialogOpen,
    editingMenu,
    deletingMenuId,
    menus,
    editingMenuData,
    isLoading,
    // Actions
    setSearch,
    setIsCreateDialogOpen,
    setEditingMenu,
    setDeletingMenuId,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    // Mutations
    deleteMenu,
    createMenu,
    updateMenu,
  };
}
