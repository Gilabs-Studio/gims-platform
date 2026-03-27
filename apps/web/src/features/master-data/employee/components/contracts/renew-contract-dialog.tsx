"use client";

import { useMemo, useState } from "react";
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

interface RenewContractFormState {
  contractNumber: string;
  contractType: ContractType;
  startDate: Date | undefined;
  endDate: Date | undefined;
  documentPath: string;
}

const getInitialFormState = (
  contract: EmployeeContract | null,
): RenewContractFormState => ({
  contractNumber: contract ? `${contract.contract_number}-RENEWED` : "",
  contractType: contract?.contract_type ?? "PKWT",
  startDate: contract?.end_date ? addDays(new Date(contract.end_date), 1) : new Date(),
  endDate: undefined,
  documentPath: "",
});

export function RenewContractDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: RenewContractDialogProps) {
  const t = useTranslations("employee");

  const initialFormState = useMemo(() => getInitialFormState(contract), [contract]);
  const [draftForm, setDraftForm] = useState<RenewContractFormState | null>(null);

  const renewMutation = useRenewEmployeeContract();
  const formState = draftForm ?? initialFormState;

  const isPermanent = formState.contractType === "PKWTT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract) return;

    // Validation
    if (!formState.contractNumber.trim()) {
      toast.error(t("contract.validation.contractNumberRequired"));
      return;
    }
    if (!formState.startDate) {
      toast.error(t("contract.validation.startDateRequired"));
      return;
    }
    if (!isPermanent && !formState.endDate) {
      toast.error(t("contract.validation.endDateRequired"));
      return;
    }
    if (
      !isPermanent &&
      formState.endDate &&
      formState.startDate &&
      formState.endDate <= formState.startDate
    ) {
      toast.error(t("contract.validation.invalidDateRange"));
      return;
    }

    const data: RenewEmployeeContractData = {
      contract_number: formState.contractNumber,
      contract_type: formState.contractType,
      start_date: format(formState.startDate, "yyyy-MM-dd"),
      end_date: formState.endDate
        ? format(formState.endDate, "yyyy-MM-dd")
        : undefined,
      document_path: formState.documentPath || undefined,
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
    } catch {
      toast.error(t("contract.messages.renewError"));
    }
  };

  const resetForm = () => {
    setDraftForm(null);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !renewMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
                    value={formState.contractNumber}
                    onChange={(e) =>
                      setDraftForm((prev) => ({
                        ...(prev ?? initialFormState),
                        contractNumber: e.target.value,
                      }))
                    }
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
                    value={formState.contractType}
                    onValueChange={(v) => {
                      setDraftForm((prev) => ({
                        ...(prev ?? initialFormState),
                        contractType: v as ContractType,
                        endDate:
                          v === "PKWTT"
                            ? undefined
                            : (prev ?? initialFormState).endDate,
                      }));
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
                          !formState.startDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formState.startDate
                          ? format(formState.startDate, "PPP")
                          : t("form.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formState.startDate}
                        onSelect={(date: Date | undefined) =>
                          setDraftForm((prev) => ({
                            ...(prev ?? initialFormState),
                            startDate: date,
                          }))
                        }
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
                          !formState.endDate && "text-muted-foreground",
                        )}
                        disabled={isPermanent}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formState.endDate
                          ? format(formState.endDate, "PPP")
                          : isPermanent
                            ? t("contract.noEndDate")
                            : t("form.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formState.endDate}
                        onSelect={(date: Date | undefined) =>
                          setDraftForm((prev) => ({
                            ...(prev ?? initialFormState),
                            endDate: date,
                          }))
                        }
                        disabled={(date) =>
                          formState.startDate ? date <= formState.startDate : false
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
                  value={formState.documentPath}
                  onChange={(url) =>
                    setDraftForm((prev) => ({
                      ...(prev ?? initialFormState),
                      documentPath: url || "",
                    }))
                  }
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
              onClick={() => handleDialogOpenChange(false)}
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
