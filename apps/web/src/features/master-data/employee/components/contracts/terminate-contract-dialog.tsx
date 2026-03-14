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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { EmployeeContract, TerminationReason } from "../../types";
import { useTerminateEmployeeContract } from "../../hooks/use-employees";
import { toast } from "sonner";

interface TerminateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  contract: EmployeeContract | null;
  onSuccess?: () => void;
}

const TERMINATION_REASONS: TerminationReason[] = [
  "RESIGNED",
  "DISMISSED",
  "END_CONTRACT",
  "OTHER",
];

export function TerminateContractDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: TerminateContractDialogProps) {
  const t = useTranslations("employee");

  const [reason, setReason] = useState<TerminationReason | "">("");
  const [notes, setNotes] = useState("");

  const terminateMutation = useTerminateEmployeeContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error(t("contract.validation.reasonRequired"));
      return;
    }

    if (!contract) return;

    try {
      await terminateMutation.mutateAsync({
        employeeId,
        contractId: contract.id,
        data: {
          reason,
          notes: notes || undefined,
        },
      });
      toast.success(t("contract.messages.terminateSuccess"));
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error) {
      toast.error(t("contract.messages.terminateError"));
    }
  };

  const resetForm = () => {
    setReason("");
    setNotes("");
  };

  const handleClose = () => {
    if (!terminateMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="h-5 w-5" />
              {t("contract.actions.terminate")}
            </DialogTitle>
            <DialogDescription>
              {t("contract.terminateDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">
                    {t("contract.terminateWarning")}
                  </p>
                  <p className="text-sm text-warning mt-1">
                    {t("contract.terminateWarningDetail")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">
                  {t("contract.fields.terminationReason")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={reason}
                  onValueChange={(v) => setReason(v as TerminationReason)}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder={t("form.selectReason")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMINATION_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`contract.terminationReasons.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {t("contract.fields.terminationNotes")}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("contract.placeholders.terminationNotes")}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={terminateMutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={terminateMutation.isPending}
            >
              {terminateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.processing")}
                </>
              ) : (
                t("contract.actions.terminate")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
