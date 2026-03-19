"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  useSpareParts,
  useDeleteSparePart,
} from "../hooks/use-asset-maintenance";
import type { SparePart } from "../types";

interface SparePartListProps {
  onCreate: () => void;
  onEdit: (sparePart: SparePart) => void;
}

export function SparePartList({ onCreate, onEdit }: SparePartListProps) {
  const t = useTranslations("assetMaintenance");
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sparePartToDelete, setSparePartToDelete] = useState<SparePart | null>(null);

  const { data: sparePartsData, isLoading } = useSpareParts({
    search: search || undefined,
  });

  const deleteSparePart = useDeleteSparePart();

  const spareParts = sparePartsData?.data || [];

  const handleDeleteClick = (sparePart: SparePart) => {
    setSparePartToDelete(sparePart);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sparePartToDelete) {
      deleteSparePart.mutate(sparePartToDelete.id);
      setDeleteDialogOpen(false);
      setSparePartToDelete(null);
    }
  };

  const getStockStatusBadge = (sparePart: SparePart) => {
    if (sparePart.is_out_of_stock) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t("spareParts.status.outOfStock")}
        </Badge>
      );
    }
    if (sparePart.is_low_stock) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t("spareParts.status.lowStock")}
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <Package className="h-3 w-3" />
        {t("spareParts.status.inStock")}
      </Badge>
    );
  };

  if (isLoading) {
    return <SparePartListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{t("spareParts.title")}</CardTitle>
            <Button onClick={onCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t("spareParts.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("spareParts.title")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spareParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No spare parts found
                    </TableCell>
                  </TableRow>
                ) : (
                  spareParts.map((sparePart) => (
                    <TableRow key={sparePart.id}>
                      <TableCell>
                        <div className="font-medium">{sparePart.part_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sparePart.part_name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {sparePart.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{sparePart.unit_of_measure}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {sparePart.current_stock} / {sparePart.reorder_point}
                        </div>
                        {sparePart.max_stock_level && (
                          <div className="text-xs text-muted-foreground">
                            Max: {sparePart.max_stock_level}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(sparePart.unit_cost, "IDR")}</TableCell>
                      <TableCell>{formatCurrency(sparePart.stock_value, "IDR")}</TableCell>
                      <TableCell>{getStockStatusBadge(sparePart)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(sparePart)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(sparePart)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <AlertDialogTitle>{t("spareParts.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm.deleteSparePart")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSparePartToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SparePartListSkeleton() {
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
