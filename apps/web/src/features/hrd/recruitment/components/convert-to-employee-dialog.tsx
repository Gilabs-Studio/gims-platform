"use client";

import { useTranslations } from "next-intl";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConvertToEmployee } from "../hooks/use-applicants";
import type { RecruitmentApplicant } from "../types";

interface ConvertToEmployeeDialogProps {
  applicant: RecruitmentApplicant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConvertToEmployeeDialog({
  applicant,
  open,
  onOpenChange,
  onSuccess,
}: ConvertToEmployeeDialogProps) {
  const t = useTranslations("recruitment");
  const convertMutation = useConvertToEmployee();

  const handleConfirm = async () => {
    if (!applicant) return;

    // Send empty object - backend will use applicant data automatically
    convertMutation.mutate(
      { id: applicant.id, data: {} },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const isSubmitting = convertMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("applicants.convertTitle")}
          </DialogTitle>
          <DialogDescription>{t("applicants.convertDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Applicant Info Summary */}
          {applicant && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">{t("applicants.fields.fullName")}</span>
                <p className="font-medium">{applicant.full_name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t("applicants.fields.email")}</span>
                <p className="font-medium">{applicant.email}</p>
              </div>
              {applicant.phone && (
                <div>
                  <span className="text-sm text-muted-foreground">{t("applicants.fields.phone")}</span>
                  <p className="font-medium">{applicant.phone}</p>
                </div>
              )}
            </div>
          )}

          {/* Info Alert */}
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-foreground">
              {t("applicants.convertInfo")}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("applicants.convertToEmployee")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
