"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import { useCreateEmployeeCertification } from "../../hooks/use-employees";

interface CreateCertificationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly onSuccess?: () => void;
}

export function CreateCertificationDialog({
  open,
  onOpenChange,
  employeeId,
  onSuccess,
}: CreateCertificationDialogProps) {
  const t = useTranslations("employee");
  const createMutation = useCreateEmployeeCertification();

  const [certificateName, setCertificateName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [noExpiry, setNoExpiry] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState("");
  const [certificateFile, setCertificateFile] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setCertificateName("");
    setIssuedBy("");
    setIssueDate(undefined);
    setExpiryDate(undefined);
    setNoExpiry(false);
    setCertificateNumber("");
    setCertificateFile("");
    setDescription("");
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!certificateName || !issuedBy || !issueDate) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!noExpiry && expiryDate && expiryDate <= issueDate) {
      toast.error("Expiry date must be after issue date");
      return;
    }

    const payload: Record<string, unknown> = {
      certificate_name: certificateName,
      issued_by: issuedBy,
      issue_date: format(issueDate, "yyyy-MM-dd"),
      certificate_number: certificateNumber || undefined,
      certificate_file: certificateFile || undefined,
      description: description || undefined,
    };

    if (!noExpiry && expiryDate) {
      payload.expiry_date = format(expiryDate, "yyyy-MM-dd");
    }

    try {
      await createMutation.mutateAsync({
        employeeId,
        data: payload as import("../../types").CreateEmployeeCertificationData,
      });
      toast.success(t("certification.success.created"));
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("certification.error.createFailed"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("certification.form.createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("certification.fields.certificateName")} *</Label>
            <Input
              value={certificateName}
              onChange={(e) => setCertificateName(e.target.value)}
              placeholder={t("certification.form.certificateNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("certification.fields.issuedBy")} *</Label>
            <Input
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder={t("certification.form.issuedByPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("certification.fields.issueDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !issueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate
                      ? format(issueDate, "PPP")
                      : t("certification.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={setIssueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("certification.fields.expiryDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={noExpiry}
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !expiryDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate
                      ? format(expiryDate, "PPP")
                      : t("certification.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={issueDate ? (date) => date <= issueDate : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="no-expiry"
              checked={noExpiry}
              onCheckedChange={(checked) => {
                setNoExpiry(checked === true);
                if (checked) setExpiryDate(undefined);
              }}
            />
            <Label htmlFor="no-expiry" className="text-sm cursor-pointer">
              {t("certification.form.noExpiryLabel")}
            </Label>
          </div>

          <div className="space-y-2">
            <Label>{t("certification.fields.certificateNumber")}</Label>
            <Input
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder={t("certification.form.certificateNumberPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("certification.fields.certificateFile")}</Label>
            <FileUpload
              value={certificateFile}
              onChange={setCertificateFile}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("certification.fields.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("certification.form.descriptionPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="cursor-pointer"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {createMutation.isPending
              ? t("certification.actions.processing")
              : t("certification.actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
