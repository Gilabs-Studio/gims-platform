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
import { Edit, Loader2 } from "lucide-react";
import { EmployeeContract, UpdateEmployeeContractData } from "../../types";
import { useUpdateEmployeeContract } from "../../hooks/use-employees";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  contract: EmployeeContract | null;
  onSuccess?: () => void;
}

export function EditContractDialog({
  open,
  onOpenChange,
  employeeId,
  contract,
  onSuccess,
}: EditContractDialogProps) {
  const t = useTranslations("employee");

  const [contractNumber, setContractNumber] = useState(
    contract?.contract_number || "",
  );
  const [documentPath, setDocumentPath] = useState(
    contract?.document_path || "",
  );

  const updateMutation = useUpdateEmployeeContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract) return;

    if (!contractNumber.trim()) {
      toast.error(t("contract.validation.contractNumberRequired"));
      return;
    }

    const data: UpdateEmployeeContractData = {
      contract_number: contractNumber,
      document_path: documentPath || undefined,
    };

    try {
      await updateMutation.mutateAsync({
        employeeId,
        contractId: contract.id,
        data,
      });
      toast.success(t("contract.messages.updateSuccess"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("contract.messages.updateError"));
    }
  };

  const handleClose = () => {
    if (!updateMutation.isPending) {
      onOpenChange(false);
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
              disabled={updateMutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.saving")}
                </>
              ) : (
                t("actions.save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
