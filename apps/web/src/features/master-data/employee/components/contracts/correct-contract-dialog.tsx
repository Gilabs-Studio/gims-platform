"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, AlertCircle, Loader2, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  EmployeeContract,
  CorrectEmployeeContractData,
  ContractType,
} from "../../types";
import { useCorrectActiveEmployeeContract } from "../../hooks/use-employees";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";

interface CorrectContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  contract: EmployeeContract | null;
  onSuccess?: () => void;
}

const CONTRACT_TYPES: ContractType[] = ["PKWTT", "PKWT", "Intern"];

export function CorrectContractDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: CorrectContractDialogProps) {
  const t = useTranslations("employee");

  const [contractType, setContractType] = useState<ContractType | undefined>(
    undefined,
  );
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [documentPath, setDocumentPath] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const correctMutation = useCorrectActiveEmployeeContract();

  useEffect(() => {
    if (open && contract) {
      setContractType(contract.contract_type);
      setStartDate(
        contract.start_date ? new Date(contract.start_date) : undefined,
      );
      setEndDate(contract.end_date ? new Date(contract.end_date) : undefined);
      setDocumentPath(contract.document_path || "");
      setCorrectionReason("");
    }
  }, [open, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correctionReason.trim()) {
      toast.error(t("contract.validation.correctionReasonRequired"));
      return;
    }

    const data: CorrectEmployeeContractData = {
      contract_type: contractType,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      end_date:
        contractType === "PKWTT"
          ? undefined
          : endDate
            ? format(endDate, "yyyy-MM-dd")
            : undefined,
      document_path: documentPath || undefined,
    };

    try {
      await correctMutation.mutateAsync({ employeeId, data });
      toast.success(t("contract.messages.correctSuccess"));
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error) {
      toast.error(t("contract.messages.correctError"));
    }
  };

  const resetForm = () => {
    setContractType(contract?.contract_type);
    setStartDate(
      contract?.start_date ? new Date(contract.start_date) : undefined,
    );
    setEndDate(contract?.end_date ? new Date(contract.end_date) : undefined);
    setDocumentPath(contract?.document_path || "");
    setCorrectionReason("");
  };

  const handleClose = () => {
    if (!correctMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t("contract.actions.edit")}
            </DialogTitle>
            <DialogDescription>
              {t("contract.editDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">
                    {t("contract.correctWarning")}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {t("contract.correctWarningDetail")}
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <Label htmlFor="contractType">
                {t("contract.fields.contractType")}
              </Label>
              <Select
                value={contractType}
                onValueChange={(v) => setContractType(v as ContractType)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("form.contractTypePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`contract.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">
                {t("contract.fields.startDate")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : t("form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date - Only for non-PKWTT */}
            {contractType !== "PKWTT" && (
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("contract.fields.endDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : t("form.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Document */}
            <div className="space-y-2">
              <Label htmlFor="document">{t("contract.fields.document")}</Label>
              <FileUpload
                value={documentPath}
                onChange={(url) => setDocumentPath(url || "")}
                placeholder={t("contract.placeholders.document")}
                accept=".pdf,.doc,.docx"
              />
            </div>

            {/* Correction Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t("contract.fields.correctionReason")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder={t("contract.placeholders.correctionReason")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={correctMutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={correctMutation.isPending}>
              {correctMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.saving")}
                </>
              ) : (
                t("contract.actions.edit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
