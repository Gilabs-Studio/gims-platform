"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Pencil, Trash2, ArrowRight, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useWorkOrders,
  useDeleteWorkOrder,
  useUpdateWorkOrderStatus,
} from "../hooks/use-asset-maintenance";
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority, WorkOrderType } from "../types";

interface WorkOrderListProps {
  onCreate: () => void;
  onEdit: (workOrder: WorkOrder) => void;
}

export function WorkOrderList({ onCreate, onEdit }: WorkOrderListProps) {
  const t = useTranslations("assetMaintenance");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<WorkOrderStatus | "all">("all");
  const [priority, setPriority] = useState<WorkOrderPriority | "all">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [workOrderToUpdate, setWorkOrderToUpdate] = useState<WorkOrder | null>(null);
  const [newStatus, setNewStatus] = useState<WorkOrderStatus | null>(null);

  const { data: workOrdersData, isLoading } = useWorkOrders({
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
  });

  const deleteWorkOrder = useDeleteWorkOrder();
  const updateStatus = useUpdateWorkOrderStatus();

  const workOrders = workOrdersData?.data || [];

  const handleDeleteClick = (workOrder: WorkOrder) => {
    setWorkOrderToDelete(workOrder);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (workOrderToDelete) {
      deleteWorkOrder.mutate(workOrderToDelete.id);
      setDeleteDialogOpen(false);
      setWorkOrderToDelete(null);
    }
  };

  const handleStatusTransition = (workOrder: WorkOrder, status: WorkOrderStatus) => {
    setWorkOrderToUpdate(workOrder);
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusUpdate = () => {
    if (workOrderToUpdate && newStatus) {
      updateStatus.mutate({
        id: workOrderToUpdate.id,
        data: { status: newStatus },
      });
      setStatusDialogOpen(false);
      setWorkOrderToUpdate(null);
      setNewStatus(null);
    }
  };

  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case "open":
        return <Badge variant="secondary">{t("workOrders.statuses.open")}</Badge>;
      case "in_progress":
        return <Badge variant="info">{t("workOrders.statuses.in_progress")}</Badge>;
      case "completed":
        return <Badge variant="success">{t("workOrders.statuses.completed")}</Badge>;
      case "cancelled":
        return <Badge variant="outline">{t("workOrders.statuses.cancelled")}</Badge>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: WorkOrderPriority) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline">{t("workOrders.priorities.low")}</Badge>;
      case "medium":
        return <Badge variant="secondary">{t("workOrders.priorities.medium")}</Badge>;
      case "high":
        return <Badge variant="warning">{t("workOrders.priorities.high")}</Badge>;
      case "critical":
        return <Badge variant="destructive">{t("workOrders.priorities.critical")}</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: WorkOrderType) => {
    switch (type) {
      case "preventive":
        return <Badge variant="secondary">{t("workOrders.types.preventive")}</Badge>;
      case "corrective":
        return <Badge variant="outline">{t("workOrders.types.corrective")}</Badge>;
      case "emergency":
        return <Badge variant="destructive">{t("workOrders.types.emergency")}</Badge>;
      default:
        return null;
    }
  };

  const canTransitionTo = (workOrder: WorkOrder, status: WorkOrderStatus) => {
    return workOrder.can_transition?.[status] || false;
  };

  if (isLoading) {
    return <WorkOrderListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{t("workOrders.title")}</CardTitle>
            <Button onClick={onCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t("workOrders.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("workOrders.title")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as WorkOrderStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">{t("workOrders.statuses.open")}</SelectItem>
                <SelectItem value="in_progress">{t("workOrders.statuses.in_progress")}</SelectItem>
                <SelectItem value="completed">{t("workOrders.statuses.completed")}</SelectItem>
                <SelectItem value="cancelled">{t("workOrders.statuses.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as WorkOrderPriority | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">{t("workOrders.priorities.low")}</SelectItem>
                <SelectItem value="medium">{t("workOrders.priorities.medium")}</SelectItem>
                <SelectItem value="high">{t("workOrders.priorities.high")}</SelectItem>
                <SelectItem value="critical">{t("workOrders.priorities.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO Number</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No work orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  workOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell>
                        <div className="font-medium">{wo.wo_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{wo.asset?.name}</div>
                        <div className="text-sm text-muted-foreground">{wo.asset?.code}</div>
                      </TableCell>
                      <TableCell>{getTypeBadge(wo.wo_type)}</TableCell>
                      <TableCell>{getPriorityBadge(wo.priority)}</TableCell>
                      <TableCell>
                        {wo.planned_date ? formatDate(wo.planned_date) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(wo.status)}</TableCell>
                      <TableCell>{formatCurrency(wo.actual_cost, "IDR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canTransitionTo(wo, "in_progress") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusTransition(wo, "in_progress")}
                              className="h-8 w-8 text-blue-600"
                              title="Start Work"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                          {canTransitionTo(wo, "completed") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusTransition(wo, "completed")}
                              className="h-8 w-8 text-green-600"
                              title="Complete"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(wo)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {wo.status !== "completed" && wo.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(wo)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workOrders.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm.deleteWorkOrder")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWorkOrderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status to{" "}
              <strong>{newStatus?.replace("_", " ")}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setWorkOrderToUpdate(null);
                setNewStatus(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusUpdate}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkOrderListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
