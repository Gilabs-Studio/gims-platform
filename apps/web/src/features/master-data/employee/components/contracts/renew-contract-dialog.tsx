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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ContractType,
  EmployeeContract,
  RenewEmployeeContractData,
} from "../../types";
import { useRenewEmployeeContract } from "../../hooks/use-employees";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";

interface RenewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  contract: EmployeeContract | null;
  onSuccess?: () => void;
}

const CONTRACT_TYPES: ContractType[] = ["PKWTT", "PKWT", "Intern"];

export function RenewContractDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: RenewContractDialogProps) {
  const t = useTranslations("employee");

  const [contractNumber, setContractNumber] = useState("");
  const [contractType, setContractType] = useState<ContractType>("PKWT");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [documentPath, setDocumentPath] = useState<string>("");

  const renewMutation = useRenewEmployeeContract();

  const isPermanent = contractType === "PKWTT";

  // Pre-fill form when contract changes
  useEffect(() => {
    if (open && contract) {
      // Generate new contract number
      setContractNumber(`${contract.contract_number}-RENEWED`);
      setContractType(contract.contract_type);

      // Set start date to day after old contract ends (or today if no end date)
      if (contract.end_date) {
        const oldEnd = new Date(contract.end_date);
        setStartDate(addDays(oldEnd, 1));
      } else {
        setStartDate(new Date());
      }

      setEndDate(undefined);
      setDocumentPath("");
    }
  }, [open, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract) return;

    // Validation
    if (!contractNumber.trim()) {
      toast.error(t("contract.validation.contractNumberRequired"));
      return;
    }
    if (!startDate) {
      toast.error(t("contract.validation.startDateRequired"));
      return;
    }
    if (!isPermanent && !endDate) {
      toast.error(t("contract.validation.endDateRequired"));
      return;
    }
    if (!isPermanent && endDate && endDate <= startDate) {
      toast.error(t("contract.validation.invalidDateRange"));
      return;
    }

    const data: RenewEmployeeContractData = {
      contract_number: contractNumber,
      contract_type: contractType,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      document_path: documentPath || undefined,
    };

    try {
      await renewMutation.mutateAsync({
        employeeId,
        contractId: contract.id,
        data,
      });
      toast.success(t("contract.messages.renewSuccess"));
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error) {
      toast.error(t("contract.messages.renewError"));
    }
  };

  const resetForm = () => {
    setContractNumber("");
    setContractType("PKWT");
    setStartDate(undefined);
    setEndDate(undefined);
    setDocumentPath("");
  };

  const handleClose = () => {
    if (!renewMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              {t("contract.actions.renew")}
            </DialogTitle>
            <DialogDescription>
              {t("contract.renewDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">
                    {t("contract.renewInfo")}
                  </p>
                  <p className="text-sm text-primary mt-1">
                    {t("contract.renewInfoDetail")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Contract Number */}
                <div className="space-y-2">
                  <Label htmlFor="contractNumber">
                    {t("contract.fields.contractNumber")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contractNumber"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder={t("contract.placeholders.contractNumber")}
                  />
                </div>

                {/* Contract Type */}
                <div className="space-y-2">
                  <Label htmlFor="contractType">
                    {t("contract.fields.contractType")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={contractType}
                    onValueChange={(v) => {
                      setContractType(v as ContractType);
                      if (v === "PKWTT") {
                        setEndDate(undefined);
                      }
                    }}
                  >
                    <SelectTrigger id="contractType">
                      <SelectValue />
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
                    {t("contract.fields.startDate")}{" "}
                    <span className="text-destructive">*</span>
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

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    {t("contract.fields.endDate")}
                    {!isPermanent && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground",
                        )}
                        disabled={isPermanent}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate
                          ? format(endDate, "PPP")
                          : isPermanent
                            ? t("contract.noEndDate")
                            : t("form.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) =>
                          startDate ? date <= startDate : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Document */}
              <div className="space-y-2">
                <Label htmlFor="document">
                  {t("contract.fields.document")}
                </Label>
                <FileUpload
                  value={documentPath}
                  onChange={(url) => setDocumentPath(url || "")}
                  placeholder={t("contract.placeholders.document")}
                  accept=".pdf,.doc,.docx"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={renewMutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={renewMutation.isPending}>
              {renewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.processing")}
                </>
              ) : (
                t("contract.actions.renew")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
