"use client";

import { useState } from "react";
import { 
  Edit, Trash2, CheckCircle2, XCircle, Clock, MapPin, 
  User, Building2, Phone, FileText, Info, LogIn, LogOut, CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { VisitForm } from "./visit-form";
import {
  useDeleteVisit,
  useUpdateVisitStatus,
  useVisit,
  useVisitDetails,
  useVisitProgressHistory,
  useCheckIn,
  useCheckOut,
} from "../hooks/use-visits";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { SalesVisit } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useVisitDetail } from "../hooks/use-visit-detail";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { QuotationProductDetailModal } from "../../quotation/components/quotation-product-detail-modal";

interface VisitDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly visit: SalesVisit | null;
}

export function VisitDetailModal({
  open,
  onClose,
  visit,
}: VisitDetailModalProps) {
  const deleteVisit = useDeleteVisit();
  const updateStatus = useUpdateVisitStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Pagination state for products
  const [productsPage, setProductsPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  // Use static t function temporarily until visit namespace is fully ready
  const t = useTranslations("visit");

  const {
    canViewEmployee,
    canViewProduct,
    isEmployeeOpen, setIsEmployeeOpen, selectedEmployeeId,
    isProductOpen, setIsProductOpen, selectedProductId,
    openEmployee, openProduct,
  } = useVisitDetail();

  // Fetch full detail
  const { data: detailData, isLoading } = useVisit(visit?.id ?? "", {
    enabled: open && !!visit?.id,
  });

  // Fetch product details
  const { data: detailsData, isLoading: detailsLoading } = useVisitDetails(
    visit?.id ?? "",
    { page: productsPage, per_page: pageSize },
    { enabled: open && !!visit?.id }
  );

  // Fetch history
  const { data: historyData, isLoading: historyLoading } = useVisitProgressHistory(
    visit?.id ?? "",
    { per_page: 100 },
    { enabled: open && !!visit?.id }
  );

  const canEdit = useUserPermission("sales_visit.update");
  const canDelete = useUserPermission("sales_visit.delete");

  if (!visit) return null;

  const displayVisit = detailData?.data ?? visit;
  const productDetails = detailsData?.data ?? [];
  const historyList = historyData?.data ?? [];

  const handleDelete = async () => {
    if (!visit?.id) return;
    try {
      await deleteVisit.mutateAsync(visit.id);
      toast.success("Visit deleted successfully");
      onClose();
    } catch {
      toast.error("Failed to delete visit");
    }
  };

  const handleCheckIn = async () => {
    if (!visit?.id) return;
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await checkIn.mutateAsync({
              id: visit.id,
              data: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            });
            toast.success("Checked in successfully");
          },
          async () => {
            await checkIn.mutateAsync({ id: visit.id, data: {} });
            toast.success("Checked in successfully");
          }
        );
      } else {
        await checkIn.mutateAsync({ id: visit.id, data: {} });
        toast.success("Checked in successfully");
      }
    } catch {
      toast.error("Check-in failed");
    }
  };

  const handleCheckOut = async () => {
    if (!visit?.id) return;
    try {
      await checkOut.mutateAsync({ id: visit.id, data: {} });
      toast.success("Checked out successfully");
    } catch {
      toast.error("Check-out failed");
    }
  };

  const handleCancel = async () => {
    if (!visit?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: visit.id,
        data: { status: "cancelled", notes: "Cancelled via detail modal" },
      });
      toast.success("Visit cancelled");
    } catch {
      toast.error("Failed to cancel visit");
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Planned</Badge>;
      case "in_progress":
        return <Badge variant="info"><MapPin className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case "completed":
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl mb-2">{displayVisit.code}</DialogTitle>
                <div className="flex items-center gap-3">
                  {getStatusBadge(displayVisit.status)}
                  <span className="text-sm text-muted-foreground flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {new Date(displayVisit.visit_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && displayVisit.status === "planned" && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCheckIn} className="cursor-pointer">
                      <LogIn className="h-4 w-4 mr-2" /> Check In
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {canEdit && displayVisit.status === "in_progress" && (
                  <Button variant="outline" size="sm" onClick={handleCheckOut} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> Check Out
                  </Button>
                )}
                {canEdit && (displayVisit.status === "planned" || displayVisit.status === "in_progress") && (
                  <Button variant="ghost" size="icon" onClick={handleCancel} className="cursor-pointer text-destructive">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && displayVisit.status === "planned" && (
                  <Button variant="ghost" size="icon" onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Products Discussed</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" /> Sales Rep & Customer
                    </h3>
                    <div className="space-y-2 text-sm">
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Sales Rep:</span>
                         {canViewEmployee && displayVisit.employee ? (
                           <button
                             onClick={() => openEmployee(displayVisit.employee?.id)}
                             className="col-span-2 font-medium text-primary hover:underline cursor-pointer text-left"
                           >
                             {displayVisit.employee.name}
                           </button>
                         ) : (
                           <span className="col-span-2 font-medium">{displayVisit.employee?.name}</span>
                         )}
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Company:</span>
                         <span className="col-span-2 font-medium">{displayVisit.company?.name}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Contact:</span>
                         <span className="col-span-2 font-medium">{displayVisit.contact_person}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Phone:</span>
                         <span className="col-span-2 font-medium">
                           {displayVisit.contact_phone ? (
                             <a
                               href={`https://wa.me/${displayVisit.contact_phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}`}
                               target="_blank"
                               rel="noreferrer"
                               className="text-primary hover:underline"
                             >
                               {displayVisit.contact_phone}
                             </a>
                           ) : "-"}
                         </span>
                       </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Visit Details
                    </h3>
                    <div className="space-y-2 text-sm">
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Scheduled:</span>
                         <span className="col-span-2 font-medium">{displayVisit.scheduled_time ?? "-"}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Check In:</span>
                         <span className="col-span-2 font-medium">{displayVisit.check_in_at ? new Date(displayVisit.check_in_at).toLocaleString() : "-"}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Check Out:</span>
                         <span className="col-span-2 font-medium">{displayVisit.check_out_at ? new Date(displayVisit.check_out_at).toLocaleString() : "-"}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                         <span className="text-muted-foreground">Address:</span>
                         <span className="col-span-2 font-medium">{displayVisit.address}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                   <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Purpose & Notes
                   </h3>
                   <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Purpose:</span>
                        <p className="bg-background p-2 rounded border">{displayVisit.purpose || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Notes:</span>
                        <p className="bg-background p-2 rounded border whitespace-pre-wrap">{displayVisit.notes || "-"}</p>
                      </div>
                      {displayVisit.result && (
                        <div>
                          <span className="text-muted-foreground block mb-1">Result:</span>
                          <p className="bg-background p-2 rounded border whitespace-pre-wrap">{displayVisit.result}</p>
                        </div>
                      )}
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="products" className="mt-4">
                 {detailsLoading ? (
                    <Skeleton className="h-40 w-full" />
                 ) : (
                    <>
                     <div className="rounded-md border">
                        <Table>
                           <TableHeader>
                              <TableRow>
                                 <TableHead>Product</TableHead>
                                 <TableHead>Interest</TableHead>
                                 <TableHead>Qty</TableHead>
                                 <TableHead>Price</TableHead>
                                 <TableHead>Notes</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                             {productDetails.length === 0 ? (
                                <TableRow>
                                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No products discussed</TableCell>
                                </TableRow>
                             ) : (
                                productDetails.map((detail) => (
                                   <TableRow key={detail.id}>
                                      <TableCell>
                                         {canViewProduct && detail.product ? (
                                           <button
                                             onClick={() => openProduct(detail.product?.id)}
                                             className="text-primary hover:underline cursor-pointer text-left"
                                           >
                                             <div className="font-medium">{detail.product.name}</div>
                                             <div className="text-xs text-muted-foreground">{detail.product.code}</div>
                                           </button>
                                         ) : (
                                           <>
                                             <div className="font-medium">{detail.product?.name}</div>
                                             <div className="text-xs text-muted-foreground">{detail.product?.code}</div>
                                           </>
                                         )}
                                         
                                         {/* Survey Answers */}
                                         {detail.answers && detail.answers.length > 0 && (
                                           <div className="mt-2 space-y-1">
                                             {detail.answers.map((ans) => (
                                               <div key={ans.id} className="text-[10px] flex gap-1">
                                                 <span className="text-muted-foreground">{ans.question_text}:</span>
                                                 <span className="font-medium">{ans.option_text}</span>
                                               </div>
                                             ))}
                                           </div>
                                         )}
                                      </TableCell>
                                      <TableCell>
                                         <div className="flex gap-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                               <div key={i} className={`h-2 w-2 rounded-full ${i < (detail.interest_level ?? 0) ? "bg-primary" : "bg-muted"}`} />
                                            ))}
                                         </div>
                                      </TableCell>
                                      <TableCell>{detail.quantity ?? "-"}</TableCell>
                                      <TableCell>{detail.price ? formatCurrency(detail.price) : "-"}</TableCell>
                                      <TableCell className="max-w-[200px] truncate">{detail.notes}</TableCell>
                                   </TableRow>
                                ))
                             )}
                          </TableBody>
                        </Table>
                     </div>
                     
                     <div className="mt-4">
                       <DataTablePagination
                         pageIndex={productsPage}
                         pageSize={pageSize}
                         rowCount={detailsData?.meta?.pagination?.total ?? 0}
                         onPageChange={setProductsPage}
                         onPageSizeChange={(newSize) => {
                           setPageSize(newSize);
                           setProductsPage(1);
                         }}
                       />
                     </div>
                    </>
                  )}
               </TabsContent>

              <TabsContent value="history" className="mt-4">
                 {historyLoading ? (
                    <Skeleton className="h-40 w-full" />
                 ) : (
                    <div className="relative space-y-0 pl-4 border-l-2 border-muted ml-2">
                       {historyList.length === 0 ? (
                          <div className="text-muted-foreground py-4">No history available</div>
                       ) : (
                          historyList.map((history) => (
                             <div key={history.id} className="relative pb-6 last:pb-0">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                                <div className="text-sm font-medium">
                                   Status changed from <Badge variant="outline">{history.from_status}</Badge> to <Badge>{history.to_status}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                   {new Date(history.created_at).toLocaleString()}
                                </div>
                                {history.notes && (
                                   <div className="mt-2 text-sm bg-muted/50 p-2 rounded">
                                      {history.notes}
                                   </div>
                                )}
                             </div>
                          ))
                       )}
                    </div>
                 )}
              </TabsContent>
            </Tabs>
          )}

          {/* Edit Dialog (nested) */}
          {visit && (
            <VisitForm 
               open={isEditDialogOpen} 
               onClose={() => setIsEditDialogOpen(false)} 
               visit={visit} 
            />
          )}

          <DeleteDialog
            open={!!isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDelete}
            isLoading={deleteVisit.isPending}
            title="Delete Visit"
            description="Are you sure you want to delete this visit?"
          />

          <EmployeeDetailModal
            open={isEmployeeOpen}
            onOpenChange={setIsEmployeeOpen}
            employee={selectedEmployeeId ? { id: selectedEmployeeId } as unknown as MdEmployee : null}
          />

          <QuotationProductDetailModal
            open={isProductOpen}
            onOpenChange={setIsProductOpen}
            productId={selectedProductId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
