"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileText, AlertCircle, Loader2, Calendar as CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { ImportBankStatementInput } from "../types";

interface UploadStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (payload: ImportBankStatementInput) => Promise<void>;
  bankAccounts?: Array<{ id: string; code: string; name: string }>;
  companyId?: string;
}

export function UploadStatementModal({
  isOpen,
  onClose,
  onUpload,
  bankAccounts = [],
  companyId = "",
}: UploadStatementModalProps) {
  const t = useTranslations("financeBankReconciliation");
  const { user } = useAuthStore();
  const [bankAccountId, setBankAccountId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [statementBalance, setStatementBalance] = useState<number | undefined>(undefined);
  const [fileFormat, setFileFormat] = useState<"pdf" | "csv" | "mt940" | "ofx">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const activeBankAccountId = bankAccountId || bankAccounts[0]?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please select a statement file to upload.");
      return;
    }

    const targetBankAccountId = bankAccountId || bankAccounts[0]?.id || "";
    if (!targetBankAccountId) {
      setErrorMessage("Please select a valid bank account.");
      return;
    }

    const resolvedCompanyId =
      companyId || user?.tenant_id || (bankAccounts[0] as { company_id?: string })?.company_id || "";

    const dateStr = selectedDate
      ? selectedDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await onUpload({
        company_id: resolvedCompanyId,
        bank_account_id: targetBankAccountId,
        statement_date: dateStr,
        statement_balance: statementBalance,
        file_format: fileFormat,
        file: file,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toast.failed");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            {t("uploadStatement")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <FieldGroup className="space-y-3">
            {/* Bank Account Field */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="bankAccount">{t("fields.bankAccount")}</FieldLabel>
              <select
                id="bankAccount"
                value={activeBankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {bankAccounts.length === 0 ? (
                  <option value="">No bank accounts available</option>
                ) : (
                  bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))
                )}
              </select>
            </Field>

            {/* Statement Date & Format Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="statementDate">{t("fields.statementDate")}</FieldLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 justify-start text-left text-xs font-normal cursor-pointer"
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      {selectedDate
                        ? selectedDate.toISOString().split("T")[0]
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d: Date | undefined) => {
                        if (d instanceof Date) {
                          setSelectedDate(d);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="fileFormat">{t("fields.fileFormat")}</FieldLabel>
                <select
                  id="fileFormat"
                  value={fileFormat}
                  onChange={(e) =>
                    setFileFormat(e.target.value as "pdf" | "csv" | "mt940" | "ofx")
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="pdf">PDF (Bank Statement)</option>
                  <option value="csv">CSV (Comma-Separated)</option>
                  <option value="mt940">MT940 (SWIFT)</option>
                  <option value="ofx">OFX (Open Financial)</option>
                </select>
              </Field>
            </div>

            {/* Statement Balance Field with Modular NumericInput */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="statementBalance">{t("fields.statementBalance")}</FieldLabel>
              <NumericInput
                id="statementBalance"
                placeholder="e.g. 48.985,60"
                value={statementBalance}
                onChange={(val) => setStatementBalance(val)}
                className="text-xs h-9"
              />
            </Field>

            {/* File Selector */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="statementFile">{t("fields.file")}</FieldLabel>
              <div className="border border-dashed border-border rounded-md p-4 text-center bg-card hover:bg-accent/30 transition-colors cursor-pointer relative">
                <input
                  id="statementFile"
                  type="file"
                  accept=".pdf,.csv,.txt,.ofx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setFile(f);
                      if (f.name.endsWith(".pdf")) setFileFormat("pdf");
                      else if (f.name.endsWith(".csv")) setFileFormat("csv");
                      else if (f.name.endsWith(".ofx")) setFileFormat("ofx");
                      else if (f.name.endsWith(".txt") || f.name.endsWith(".sta")) setFileFormat("mt940");
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-5 w-5 text-primary mb-0.5" />
                  {file ? (
                    <span className="font-medium text-foreground">{file.name}</span>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">Click to upload statement file</span>
                      <span>Supports PDF, CSV, MT940, OFX</span>
                    </>
                  )}
                </div>
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-2 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer text-xs"
            >
              {t("actions.reset")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer bg-primary text-primary-foreground text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  {t("actions.import")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
