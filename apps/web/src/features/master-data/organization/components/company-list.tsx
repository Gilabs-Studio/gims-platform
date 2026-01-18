"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MapView, type MapMarker } from "@/components/ui/map/map-view";
import { MapSidebar } from "@/components/ui/map/map-sidebar";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Map as MapIcon,
  List as ListIcon,
  Building,
} from "lucide-react";
import {
  useCompanies,
  useDeleteCompany,
  useUpdateCompany,
  useApproveCompany,
  useSubmitCompanyForApproval,
} from "../hooks/use-companies";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CompanyForm } from "./company-form";
import type { Company, CompanyStatus } from "../types";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const statusColors: Record<CompanyStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

// Dynamic import for Leaflet elements if needed for custom markers, 
// but MapView handles standard markers.
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

export function CompanyList() {
  const t = useTranslations("organization");
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMapCompanyId, setSelectedMapCompanyId] = useState<string | null>(null);

  const { data, isLoading, isError } = useCompanies({
    page: viewMode === "map" ? 1 : page, // Fetch all/more for map? Usually APIs support limit=-1 or we just page through. For now standard paging.
    per_page: viewMode === "map" ? 100 : 10, // Get more items for map view
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("company.create");
  const canUpdate = useUserPermission("company.update");
  const canDelete = useUserPermission("company.delete");
  const canApprove = useUserPermission("company.approve");

  const deleteCompany = useDeleteCompany();
  const updateCompany = useUpdateCompany();
  const submitForApproval = useSubmitCompanyForApproval();
  const approveCompany = useApproveCompany();

  const companies = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCompany.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateCompany.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.success_update", { name: name }));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleSubmitForApproval = async (company: Company) => {
    try {
      await submitForApproval.mutateAsync(company.id);
      toast.success(t("company.submitSuccess"));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleApprove = async (company: Company) => {
    try {
      await approveCompany.mutateAsync({ id: company.id, data: { action: "approve" } });
      toast.success(t("company.approveSuccess"));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleReject = async (company: Company) => {
    try {
      await approveCompany.mutateAsync({ id: company.id, data: { action: "reject" } });
      toast.success(t("company.rejectSuccess"));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCompany(null);
  };

  // Map Markers
  const markers: MapMarker<Company>[] = companies
    .filter(c => c.latitude != null && c.longitude != null)
    .map(c => ({
      id: c.id,
      latitude: c.latitude!,
      longitude: c.longitude!,
      data: c,
    }));

  const renderMarkers = (markers: MapMarker<Company>[]) => {
      return (
        <>
          {markers.map((marker) => {
            const company = marker.data;
            return (
              <Marker
                key={marker.id}
                position={[marker.latitude, marker.longitude]}
                eventHandlers={{
                  click: () => setSelectedMapCompanyId(String(marker.id)),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold">{company.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{company.address}</p>
                    <Badge className={statusColors[company.status]}>
                      {t(`company.status.${company.status}`)}
                    </Badge>
                     {canUpdate && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(company);
                          }}
                        >
                          {t("common.edit")}
                        </Button>
                      )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      );
    };

    const renderSidebarItem = (company: Company) => (
      <div className="flex items-start justify-between gap-2 p-3 hover:bg-muted/50 cursor-pointer rounded-md">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{company.name}</span>
          </div>
          {company.address && (
            <p className="text-xs text-muted-foreground truncate mb-2">
              {company.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColors[company.status] + " text-xs"}>
               {t(`company.status.${company.status}`)}
            </Badge>
          </div>
        </div>
      </div>
    );

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("company.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("company.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center border rounded-md bg-background">
            <Button
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="rounded-none rounded-l-md px-3 cursor-pointer"
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Map
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none rounded-r-md px-3 cursor-pointer"
            >
              <ListIcon className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
          
          {canCreate && (
            <Button
              onClick={() => setIsFormOpen(true)}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("common.create")}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as CompanyStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">{t("company.status.draft")}</SelectItem>
            <SelectItem value="pending">{t("company.status.pending")}</SelectItem>
            <SelectItem value="approved">{t("company.status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("company.status.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {t("company.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        {company.address && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {company.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.email || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.phone || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.village?.name || company.village?.district?.city?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[company.status]}>
                        {t(`company.status.${company.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={company.is_active}
                          onCheckedChange={() =>
                            handleStatusChange(
                              company.id,
                              company.is_active,
                              company.name,
                            )
                          }
                          disabled={updateCompany.isPending || !canUpdate}
                          className="cursor-pointer"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(company)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          
                          {/* Workflow Actions */}
                          {company.status === "draft" && canUpdate && (
                            <DropdownMenuItem
                              onClick={() => handleSubmitForApproval(company)}
                              className="cursor-pointer"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {t("company.actions.submit")}
                            </DropdownMenuItem>
                          )}
                          
                          {company.status === "pending" && canApprove && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleApprove(company)}
                                className="cursor-pointer text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {t("company.actions.approve")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReject(company)}
                                className="cursor-pointer text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                {t("company.actions.reject")}
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(company.id)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
           {/* Pagination for List */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {pagination.total_pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.total_pages}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
           <div className="md:col-span-1 border rounded-md overflow-hidden bg-background h-full">
              <MapSidebar
                 items={companies}
                 selectedItemId={selectedMapCompanyId ?? undefined}
                 title="Companies"
                 onItemClick={(item) => {
                     setSelectedMapCompanyId(String(item.id));
                 }}
                 renderItem={renderSidebarItem}
                 className="h-full border-0"
              />
           </div>
           <div className="md:col-span-3 border rounded-md overflow-hidden bg-background h-full">
              {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                      <Skeleton className="h-full w-full" />
                  </div>
              ) : (
                <MapView
                  markers={markers}
                  renderMarkers={renderMarkers}
                  className="h-full w-full"
                  defaultCenter={userLocation ?? [-6.2088, 106.8456]}
                  defaultZoom={12}
                  selectedMarkerId={selectedMapCompanyId}
                />
              )}
           </div>
        </div>
      )}

      {/* Form Dialog */}
      <CompanyForm
        open={isFormOpen}
        onClose={handleFormClose}
        company={editingCompany}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteCompany.isPending}
        title={t("company.deleteTitle")}
        description={t("company.deleteConfirm")}
      />
    </div>
  );
}

// Helper to get user location or default
const userLocation: [number, number] | undefined = undefined; // implement geo-location hooks if needed
