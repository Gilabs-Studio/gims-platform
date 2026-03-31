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

interface CorrectContractFormState {
  contractType: ContractType | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  documentPath: string;
  correctionReason: string;
}

const getInitialFormState = (
  contract: EmployeeContract | null,
): CorrectContractFormState => ({
  contractType: contract?.contract_type,
  startDate: contract?.start_date ? new Date(contract.start_date) : undefined,
  endDate: contract?.end_date ? new Date(contract.end_date) : undefined,
  documentPath: contract?.document_path || "",
  correctionReason: "",
});

export function CorrectContractDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: CorrectContractDialogProps) {
  const t = useTranslations("employee");

  const initialFormState = useMemo(() => getInitialFormState(contract), [contract]);
  const [draftForm, setDraftForm] = useState<CorrectContractFormState | null>(null);

  const correctMutation = useCorrectActiveEmployeeContract();
  const formState = draftForm ?? initialFormState;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.correctionReason.trim()) {
      toast.error(t("contract.validation.correctionReasonRequired"));
      return;
    }

    const data: CorrectEmployeeContractData = {
      contract_type: formState.contractType,
      start_date: formState.startDate
        ? format(formState.startDate, "yyyy-MM-dd")
        : undefined,
      end_date:
        formState.contractType === "PKWTT"
          ? undefined
          : formState.endDate
            ? format(formState.endDate, "yyyy-MM-dd")
            : undefined,
      document_path: formState.documentPath || undefined,
    };

    try {
      await correctMutation.mutateAsync({ employeeId, data });
      toast.success(t("contract.messages.correctSuccess"));
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch {
      toast.error(t("contract.messages.correctError"));
    }
  };

  const resetForm = () => {
    setDraftForm(null);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !correctMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">
                    {t("contract.correctWarning")}
                  </p>
                  <p className="text-sm text-warning mt-1">
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
                value={formState.contractType}
                onValueChange={(v) =>
                  setDraftForm((prev) => ({
                    ...(prev ?? initialFormState),
                    contractType: v as ContractType,
                    endDate:
                      v === "PKWTT"
                        ? undefined
                        : (prev ?? initialFormState).endDate,
                  }))
                }
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

            {/* End Date - Only for non-PKWTT */}
            {formState.contractType !== "PKWTT" && (
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("contract.fields.endDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                          !formState.endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formState.endDate
                        ? format(formState.endDate, "PPP")
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

            {/* Correction Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t("contract.fields.correctionReason")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={formState.correctionReason}
                onChange={(e) =>
                  setDraftForm((prev) => ({
                    ...(prev ?? initialFormState),
                    correctionReason: e.target.value,
                  }))
                }
                placeholder={t("contract.placeholders.correctionReason")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
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
