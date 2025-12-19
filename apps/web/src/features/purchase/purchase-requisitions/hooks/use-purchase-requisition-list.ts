"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  usePurchaseRequisitions,
  useDeletePurchaseRequisition,
  usePurchaseRequisition,
  useCreatePurchaseRequisition,
  useUpdatePurchaseRequisition,
  useApprovePurchaseRequisition,
  useRejectPurchaseRequisition,
  useConvertPurchaseRequisition,
} from "./use-purchase-requisitions";
import type {
  CreatePurchaseRequisitionFormData,
  UpdatePurchaseRequisitionFormData,
} from "../schemas/purchase-requisition.schema";

export function usePurchaseRequisitionList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<number | null>(null);
  const [deletingRequisitionId, setDeletingRequisitionId] = useState<number | null>(null);

  const { data, isLoading } = usePurchaseRequisitions({
    page,
    limit: perPage,
    search,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingRequisitionData } = usePurchaseRequisition(editingRequisition);
  const deleteRequisition = useDeletePurchaseRequisition();
  const createRequisition = useCreatePurchaseRequisition();
  const updateRequisition = useUpdatePurchaseRequisition();
  const approveRequisition = useApprovePurchaseRequisition();
  const rejectRequisition = useRejectPurchaseRequisition();
  const convertRequisition = useConvertPurchaseRequisition();

  const requisitions = data?.data || [];
  const pagination = data?.meta?.pagination;
  const sortMeta = data?.meta?.sort;
  const sortableColumns = data?.meta?.sortable_columns?.available_fields;

  // Sync sort state with meta if available (for initial load)
  useEffect(() => {
    if (sortMeta?.sort_by && sortBy === undefined) {
      setSortBy(sortMeta.sort_by);
      setSortOrder(sortMeta.sort_order as "asc" | "desc" | undefined);
    }
  }, [sortMeta, sortBy]);

  const handleCreate = async (formData: CreatePurchaseRequisitionFormData) => {
    try {
      await createRequisition.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Purchase requisition created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handleUpdate = async (formData: UpdatePurchaseRequisitionFormData) => {
    if (editingRequisition) {
      try {
        await updateRequisition.mutateAsync({ id: editingRequisition, data: formData });
        setEditingRequisition(null);
        toast.success("Purchase requisition updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingRequisitionId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deletingRequisitionId) {
      try {
        await deleteRequisition.mutateAsync(deletingRequisitionId);
        toast.success("Purchase requisition deleted successfully");
        setDeletingRequisitionId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveRequisition.mutateAsync(id);
      toast.success("Purchase requisition approved successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectRequisition.mutateAsync(id);
      toast.success("Purchase requisition rejected successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handleConvert = async (id: number) => {
    try {
      await convertRequisition.mutateAsync(id);
      toast.success("Purchase requisition converted to purchase order successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes
  };

  return {
    // State
    page,
    setPage,
    perPage,
    setPerPage: handlePerPageChange,
    search,
    setSearch,
    sortBy,
    sortOrder,
    sortMeta,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingRequisition,
    setEditingRequisition,
    deletingRequisitionId,
    setDeletingRequisitionId,
    // Data
    requisitions,
    pagination,
    editingRequisitionData,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleApprove,
    handleReject,
    handleConvert,
    handleSortChange,
    // Mutations
    deleteRequisition,
    createRequisition,
    updateRequisition,
    approveRequisition,
    rejectRequisition,
    convertRequisition,
  };
}

