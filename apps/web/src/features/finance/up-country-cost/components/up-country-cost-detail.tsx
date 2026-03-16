"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  FileText,
  MapPin,
  MessageSquare,
  User,
  XCircle,
  Loader2,
  Send
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import type { UpCountryCost } from "../types";
import {
  useFinanceUpCountryCost,
  useSubmitFinanceUpCountryCost,
  useManagerApproveFinanceUpCountryCost,
  useManagerRejectFinanceUpCountryCost,
  useFinanceApproveUpCountryCost,
  useMarkPaidFinanceUpCountryCost,
} from "../hooks/use-finance-up-country-cost";
import { toast } from "sonner";

interface DetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: UpCountryCost | null;
  onActionSuccess: () => void;
}

export function UpCountryCostDetail({ open, onOpenChange, item, onActionSuccess }: DetailProps) {
  const t = useTranslations("financeUpCountryCost");
  const canApprove = useUserPermission("up_country_cost.approve");

  const [rejectComment, setRejectComment] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const { data: employeesData } = useEmployees({ per_page: 500, is_active: true }, { enabled: open });
  const getEmployee = (id: string) => employeesData?.data?.find((employee) => employee.id === id);
  const getEmployeeName = (id: string) => {
    const emp = getEmployee(id);
    return emp ? emp.name : "-";
  };

  const detailQuery = useFinanceUpCountryCost(item?.id ?? "", { enabled: open && !!item?.id });

  const submitMutation = useSubmitFinanceUpCountryCost();
  const managerApproveMutation = useManagerApproveFinanceUpCountryCost();
  const managerRejectMutation = useManagerRejectFinanceUpCountryCost();
  const financeApproveMutation = useFinanceApproveUpCountryCost();
  const markPaidMutation = useMarkPaidFinanceUpCountryCost();

  if (!item) return null;

  const data = detailQuery.data?.data ?? item;

  const isPending =
    submitMutation.isPending ||
    managerApproveMutation.isPending ||
    managerRejectMutation.isPending ||
    financeApproveMutation.isPending ||
    markPaidMutation.isPending;

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      await action();
      toast.success(successMsg);
      onActionSuccess();
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1" />
            {t("status.submitted")}
          </Badge>
        );
      case "manager_approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.manager_approved")}
          </Badge>
        );
      case "finance_approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.finance_approved")}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <Banknote className="h-3 w-3 mr-1" />
            {t("status.paid")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-xl flex items-center gap-3">
              {t("detail.title")}
              {getStatusBadge()}
            </DialogTitle>
            <p className="font-mono text-sm text-muted-foreground">{data.code}</p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {detailQuery.isLoading && (
              <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                Loading...
              </div>
            )}

            {/* General Info */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("fields.purpose")}
                </p>
                <p className="font-medium text-base">{data.purpose}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("fields.location")}
                </p>
                <p className="font-medium text-base">{data.location || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("detail.tripInfo")}
                </p>
                <p className="font-medium">
                  {formatDate(data.start_date)} - {formatDate(data.end_date)}
                </p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm text-muted-foreground">{t("fields.notes")}</p>
                <p className="bg-muted/30 p-3 rounded-md text-sm">{data.notes || "-"}</p>
              </div>
            </div>

            <Separator />

            {/* Participants */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("detail.participants")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.employees.length === 0 && (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
                {data.employees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]" dataSeed={getEmployee(emp.employee_id)?.employee_code ?? getEmployeeName(emp.employee_id)} />
                    </Avatar>
                    <span className="text-sm font-medium">{getEmployeeName(emp.employee_id)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Expense Lines */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                {t("detail.expenseLines")}
              </h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="py-2 px-4 text-left font-medium text-muted-foreground">{t("fields.expenseDate")}</th>
                      <th className="py-2 px-4 text-left font-medium text-muted-foreground">{t("fields.costType")}</th>
                      <th className="py-2 px-4 text-left font-medium text-muted-foreground">{t("fields.costDescription")}</th>
                      <th className="py-2 px-4 text-right font-medium text-muted-foreground">{t("fields.costAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((line) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="py-2 px-4 whitespace-nowrap">{line.expense_date ? formatDate(line.expense_date) : "-"}</td>
                        <td className="py-2 px-4">{t(`costTypes.${line.cost_type as any}`)}</td>
                        <td className="py-2 px-4">{line.description || "-"}</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/20">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right font-medium">
                        {t("form.total")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-base text-primary">
                        {formatCurrency(data.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Manager Reject Input */}
            {rejecting && data.status === "submitted" && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md space-y-3 mt-6">
                   <h4 className="font-medium text-destructive flex items-center gap-2">
                     <MessageSquare className="h-4 w-4" />
                     {t("detail.rejectComment")}
                   </h4>
                   <Textarea 
                     value={rejectComment}
                     onChange={(e) => setRejectComment(e.target.value)}
                     placeholder={t("detail.rejectPlaceholder")}
                     className="bg-background"
                   />
                   <div className="flex justify-end gap-2">
                     <Button variant="outline" size="sm" onClick={() => setRejecting(false)} className="cursor-pointer">{t("form.cancel")}</Button>
                     <Button 
                       variant="destructive" 
                       size="sm" 
                       className="cursor-pointer"
                       disabled={isPending}
                       onClick={() => handleAction(() => managerRejectMutation.mutateAsync({ id: data.id, comment: rejectComment }), t("toast.managerRejected"))}
                     >
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("detail.confirmReject")}
                     </Button>
                   </div>
                </div>
            )}
          </div>
        </ScrollArea>

        {/* Workflow Actions */}
        <DialogFooter className="p-4 border-t bg-muted/20">
            <div className="flex gap-2 w-full justify-between items-center text-sm">
                <div>
                   {/* Optional left-side info or back button */}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                    {t("form.cancel")}
                  </Button>
                  
                  {canApprove && !rejecting && (
                    <>
                      {data.status === "draft" && (
                         <Button
                           className="cursor-pointer"
                           disabled={isPending}
                           onClick={() => handleAction(() => submitMutation.mutateAsync(data.id), t("toast.submitted"))}
                         >
                           {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                           <Send className="w-4 h-4 mr-2" />
                           {t("actions.submit")}
                         </Button>
                      )}
                      
                      {data.status === "submitted" && (
                         <>
                           <Button
                             variant="destructive"
                             className="cursor-pointer"
                             disabled={isPending}
                             onClick={() => setRejecting(true)}
                           >
                              <XCircle className="w-4 h-4 mr-2" />
                              {t("actions.managerReject")}
                           </Button>
                           <Button
                             className="cursor-pointer"
                             disabled={isPending}
                             onClick={() => handleAction(() => managerApproveMutation.mutateAsync(data.id), t("toast.managerApproved"))}
                           >
                             {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                             <CheckCircle2 className="w-4 h-4 mr-2" />
                             {t("actions.managerApprove")}
                           </Button>
                         </>
                      )}

                       {data.status === "manager_approved" && (
                         <Button
                           className="cursor-pointer"
                           disabled={isPending}
                           onClick={() => handleAction(() => financeApproveMutation.mutateAsync(data.id), t("toast.financeApproved"))}
                         >
                           {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                           <CheckCircle2 className="w-4 h-4 mr-2" />
                           {t("actions.financeApprove")}
                         </Button>
                      )}

                       {data.status === "finance_approved" && (
                         <Button
                           className="cursor-pointer"
                           disabled={isPending}
                           onClick={() => handleAction(() => markPaidMutation.mutateAsync(data.id), t("toast.paid"))}
                         >
                           {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                           <Banknote className="w-4 h-4 mr-2" />
                           {t("actions.markPaid")}
                         </Button>
                      )}
                    </>
                  )}
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
