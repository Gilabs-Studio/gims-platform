"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageMotion } from "@/components/motion/page-motion";
import { systemAdminService } from "../services/system-admin-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Permission, CreatePermissionRequest, PermissionMenuOption } from "../types";

type PermissionFormState = CreatePermissionRequest;

function createEmptyForm(): PermissionFormState {
  return {
    name: "",
    code: "",
    action: "",
    resource: "",
    description: "",
    menu_id: null,
  };
}

function permissionToForm(p: Permission): PermissionFormState {
  return {
    name: p.name,
    code: p.code,
    action: p.action,
    resource: p.resource ?? "",
    description: p.description ?? "",
    menu_id: p.menu_id ?? null,
  };
}

const ACTION_OPTIONS = ["view", "create", "update", "delete", "export", "import", "approve", "cancel"] as const;

export function PermissionList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [form, setForm] = useState<PermissionFormState>(createEmptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const perPage = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["sys-admin-permissions", page, perPage, search],
    queryFn: () => systemAdminService.listPermissions({ page, per_page: perPage, search: search || undefined }),
  });

  const { data: menuOptionsData } = useQuery({
    queryKey: ["sys-admin-permission-menu-options"],
    queryFn: () => systemAdminService.listPermissionMenus(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePermissionRequest) => systemAdminService.createPermission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sys-admin-permissions"] });
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create permission";
      setFormError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreatePermissionRequest }) =>
      systemAdminService.updatePermission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sys-admin-permissions"] });
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update permission";
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => systemAdminService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sys-admin-permissions"] });
      setDeleteTarget(null);
    },
  });

  const pagination = data?.meta?.pagination;
  const permissions = data?.data ?? [];
  const menuOptions: PermissionMenuOption[] = menuOptionsData?.data ?? [];

  function openCreate() {
    setEditingPermission(null);
    setForm(createEmptyForm());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(p: Permission) {
    setEditingPermission(p);
    setForm(permissionToForm(p));
    setFormError(null);
    setDialogOpen(true);
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleSubmit() {
    setFormError(null);
    if (!form.name.trim() || !form.code.trim() || !form.action.trim()) {
      setFormError("Name, code, and action are required.");
      return;
    }
    const payload: CreatePermissionRequest = {
      ...form,
      menu_id: form.menu_id || null,
    };
    if (editingPermission) {
      updateMutation.mutate({ id: editingPermission.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Permissions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage system permissions. Changes take effect immediately for all roles.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Add Permission
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or resource..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} className="cursor-pointer">
            Search
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Menu</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : permissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No permissions found.
                  </TableCell>
                </TableRow>
              ) : (
                permissions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted rounded px-1.5 py-0.5">{p.code}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {p.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.resource || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.menu ? (
                        <span title={p.menu.url}>{p.menu.name}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(pagination.page - 1) * pagination.per_page + 1}–
              {Math.min(pagination.page * pagination.per_page, pagination.total)} of{" "}
              {pagination.total} permissions
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={!pagination.has_prev}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={!pagination.has_next}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPermission ? "Edit Permission" : "Add Permission"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{formError}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="perm-name">Name *</Label>
              <Input
                id="perm-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. View Sales Orders"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="perm-code">Code *</Label>
                <Input
                  id="perm-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))}
                  placeholder="e.g. sales_order.view"
                />
                <p className="text-xs text-muted-foreground">Format: resource.action</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="perm-action">Action *</Label>
                <Input
                  id="perm-action"
                  list="perm-action-list"
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value.toLowerCase() }))}
                  placeholder="e.g. view"
                />
                <datalist id="perm-action-list">
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perm-resource">Resource</Label>
              <Input
                id="perm-resource"
                value={form.resource ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))}
                placeholder="e.g. sales_order"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perm-menu-id">Menu</Label>
              <Select
                value={form.menu_id ?? "__none__"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, menu_id: value === "__none__" ? null : value }))
                }
              >
                <SelectTrigger id="perm-menu-id">
                  <SelectValue placeholder="Select associated menu (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No menu association</SelectItem>
                  {menuOptions.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perm-description">Description</Label>
              <Textarea
                id="perm-description"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what this permission grants"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="cursor-pointer">
              {isSaving ? "Saving..." : editingPermission ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permission?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  You are about to delete{" "}
                  <strong>{deleteTarget?.name}</strong> (<code>{deleteTarget?.code}</code>).
                </p>
                <p className="mt-1 text-destructive">
                  This will revoke the permission from all roles that currently have it. This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageMotion>
  );
}
