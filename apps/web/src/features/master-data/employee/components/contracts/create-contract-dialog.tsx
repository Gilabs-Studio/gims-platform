"use client";

import { useState } from "react";
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
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ContractType, CreateEmployeeContractData } from "../../types";
import { useCreateEmployeeContract } from "../../hooks/use-employees";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onSuccess?: () => void;
}

const CONTRACT_TYPES: ContractType[] = ["PKWTT", "PKWT", "Intern"];

export function CreateContractDialog({
  open,
  onOpenChange,
  employeeId,
  onSuccess,
}: CreateContractDialogProps) {
  const t = useTranslations("employee");

  const [contractNumber, setContractNumber] = useState("");
  const [contractType, setContractType] = useState<ContractType>("PKWT");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [documentPath, setDocumentPath] = useState<string>("");

  const createMutation = useCreateEmployeeContract();

  const isPermanent = contractType === "PKWTT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const data: CreateEmployeeContractData = {
      contract_number: contractNumber,
      contract_type: contractType,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      document_path: documentPath || undefined,
    };

    try {
      await createMutation.mutateAsync({ employeeId, data });
      toast.success(t("contract.messages.createSuccess"));
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error) {
      toast.error(t("contract.messages.createError"));
    }
  };

  const resetForm = () => {
    setContractNumber("");
    setContractType("PKWT");
    setStartDate(new Date());
    setEndDate(undefined);
    setDocumentPath("");
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("contract.actions.create")}
            </DialogTitle>
            <DialogDescription>
              {t("contract.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                  {!isPermanent && <span className="text-destructive">*</span>}
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
              <Label htmlFor="document">{t("contract.fields.document")}</Label>
              <FileUpload
                value={documentPath}
                onChange={(url) => setDocumentPath(url || "")}
                placeholder={t("contract.placeholders.document")}
                accept=".pdf,.doc,.docx"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.saving")}
                </>
              ) : (
                t("contract.actions.create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
