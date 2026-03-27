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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import type { DegreeLevel, EmployeeEducationHistory } from "../../types";
import { useUpdateEmployeeEducationHistory } from "../../hooks/use-employees";

interface EditEducationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly education: EmployeeEducationHistory | null;
  readonly existingEducations?: EmployeeEducationHistory[];
  readonly onSuccess?: () => void;
}

const DEGREE_LEVELS: DegreeLevel[] = [
  "ELEMENTARY",
  "JUNIOR_HIGH",
  "SENIOR_HIGH",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
];

export function EditEducationDialog({
  open,
  onOpenChange,
  employeeId,
  education,
  existingEducations = [],
  onSuccess,
}: EditEducationDialogProps) {
  const t = useTranslations("employee");
  const updateMutation = useUpdateEmployeeEducationHistory();

  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState<DegreeLevel | "">("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isOngoing, setIsOngoing] = useState(false);
  const [gpa, setGpa] = useState("");
  const [description, setDescription] = useState("");
  const [documentPath, setDocumentPath] = useState("");

  const hasOtherOngoing = existingEducations.some(
    (e) =>
      e.id !== education?.id && !e.end_date && !e.is_completed,
  );

  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && education) {
      setInstitution(education.institution);
      setDegree(education.degree);
      setFieldOfStudy(education.field_of_study ?? "");
      setStartDate(
        education.start_date ? new Date(education.start_date) : undefined,
      );
      const hasEndDate = !!education.end_date;
      setEndDate(hasEndDate ? new Date(education.end_date!) : undefined);
      setIsOngoing(!hasEndDate);
      setGpa(education.gpa != null ? String(education.gpa) : "");
      setDescription(education.description ?? "");
      setDocumentPath(education.document_path ?? "");
    }
  }

  const handleGpaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setGpa("");
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0 && num <= 4) {
      setGpa(raw);
    }
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!education || !institution || !degree || !startDate) return;

    const parsedGpa = gpa ? parseFloat(gpa) : undefined;
    if (parsedGpa !== undefined && (parsedGpa < 1 || parsedGpa > 4)) {
      toast.error(t("education.validation.gpaRange"));
      return;
    }

    if (isOngoing && hasOtherOngoing) {
      toast.error(t("education.validation.onlyOneOngoing"));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        employeeId,
        educationId: education.id,
        data: {
          institution,
          degree: degree as DegreeLevel,
          field_of_study: fieldOfStudy || undefined,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date:
            !isOngoing && endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          gpa: parsedGpa,
          description: description || undefined,
          document_path: documentPath || undefined,
        },
      });
      toast.success(t("education.success.updated"));
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("education.error.updateFailed"));
    }
  };

  const handleOngoingChange = (checked: boolean | "indeterminate") => {
    const val = checked === true;
    if (val && hasOtherOngoing) {
      toast.error(t("education.validation.onlyOneOngoing"));
      return;
    }
    setIsOngoing(val);
    if (val) {
      setEndDate(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("education.form.editTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("education.fields.institution")} *</Label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t("education.form.institutionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("education.fields.degree")} *</Label>
            <Select
              value={degree}
              onValueChange={(v) => setDegree(v as DegreeLevel)}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("education.form.selectDegree")} />
              </SelectTrigger>
              <SelectContent>
                {DEGREE_LEVELS.map((d) => (
                  <SelectItem key={d} value={d} className="cursor-pointer">
                    {t(`education.degrees.${d}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("education.fields.fieldOfStudy")}</Label>
            <Input
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder={t("education.form.fieldOfStudyPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("education.fields.startDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "PPP")
                      : t("education.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("education.fields.endDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isOngoing}
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !endDate && "text-muted-foreground",
                      isOngoing && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isOngoing
                      ? t("education.fields.ongoing")
                      : endDate
                        ? format(endDate, "PPP")
                        : t("education.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) =>
                      startDate ? date < startDate : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ongoing-edit"
              checked={isOngoing}
              disabled={hasOtherOngoing && !isOngoing}
              onCheckedChange={handleOngoingChange}
              className="cursor-pointer"
            />
            <Label htmlFor="ongoing-edit" className="cursor-pointer text-sm font-normal">
              {t("education.form.ongoingLabel")}
              {hasOtherOngoing && !isOngoing && (
                <span className="text-muted-foreground ml-1">
                  ({t("education.validation.ongoingExists")})
                </span>
              )}
            </Label>
          </div>

          <div className="space-y-2">
            <Label>{t("education.fields.gpa")} (1.00 - 4.00)</Label>
            <Input
              type="number"
              step="0.01"
              min="1"
              max="4"
              value={gpa}
              onChange={handleGpaChange}
              placeholder={t("education.form.gpaPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("education.fields.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("education.form.descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("education.fields.document")}</Label>
            <FileUpload
              value={documentPath}
              onChange={(url) => setDocumentPath(url ?? "")}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              uploadEndpoint="/upload/document"
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
            disabled={
              !institution ||
              !degree ||
              !startDate ||
              updateMutation.isPending
            }
            className="cursor-pointer"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {updateMutation.isPending
              ? t("education.actions.processing")
              : t("education.actions.edit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
