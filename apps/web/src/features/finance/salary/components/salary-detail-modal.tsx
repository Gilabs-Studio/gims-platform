"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SalaryStructure } from "../types";

interface SalaryDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly salary: SalaryStructure | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function SalaryDetailModal({
  open,
  onOpenChange,
  salary,
}: SalaryDetailModalProps) {
  const t = useTranslations("financeSalary");

  if (!salary) return null;

  const statusVariant =
    salary.status === "active"
      ? "success"
      : salary.status === "draft"
        ? "secondary"
        : "outline";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>

        {/* Employee info */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={salary.employee?.avatar_url}
              alt={salary.employee?.name ?? ""}
            />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">
              {salary.employee?.name ?? salary.employee_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {salary.employee?.employee_code ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {salary.employee?.email ?? "—"}
            </p>
          </div>
        </div>

        {/* Details */}
        <div>
          <Row
            label={t("fields.basicSalary")}
            value={
              <span className="text-emerald-600 font-semibold">
                {formatCurrency(salary.basic_salary)}
              </span>
            }
          />
          <Row
            label={t("fields.effectiveDate")}
            value={format(new Date(salary.effective_date), "MMM dd, yyyy")}
          />
          <Row
            label={t("fields.status")}
            value={
              <Badge variant={statusVariant} className="text-xs uppercase">
                {salary.status}
              </Badge>
            }
          />
          {salary.notes && (
            <Row label={t("fields.notes")} value={salary.notes} />
          )}
          <Row
            label={t("fields.createdAt")}
            value={format(new Date(salary.created_at), "MMM dd, yyyy HH:mm")}
          />
          <Row
            label={t("fields.updatedAt")}
            value={format(new Date(salary.updated_at), "MMM dd, yyyy HH:mm")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
