"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PayrollStatus } from "../types/payroll.types";

interface PayrollStageModalProps {
  currentStatus: PayrollStatus;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStage: (newStatus: PayrollStatus) => void;
}

const STAGES: { status: PayrollStatus; label: string; desc: string; icon: typeof CheckCircle2; color: string }[] = [
  {
    status: "Draft",
    label: "Draft / Persiapan",
    desc: "Data awal dimasukkan, kalkulasi belum dikunci",
    icon: FileEdit,
    color: "text-muted-foreground bg-muted",
  },
  {
    status: "In Progress",
    label: "In Progress / Dalam Pengolahan",
    desc: "Kalkulasi komponen gaji, lembur, dan PPh 21 berjalan",
    icon: Clock,
    color: "text-warning bg-warning/10 border-warning/30",
  },
  {
    status: "Under Review",
    label: "Under Review / Verifikasi Finance",
    desc: "Peninjauan oleh tim Keuangan & HR Manager",
    icon: ShieldCheck,
    color: "text-primary bg-primary/10 border-primary/30",
  },
  {
    status: "Approved",
    label: "Approved / Disetujui",
    desc: "Persetujuan final, siap untuk ekspor transfer bank",
    icon: CheckCircle2,
    color: "text-success bg-success/10 border-success/30",
  },
  {
    status: "Completed",
    label: "Completed / Selesai (Paid)",
    desc: "File bank dieksekusi dan slip gaji terkirim",
    icon: Check,
    color: "text-success bg-success/20 border-success/40",
  },
];

export function PayrollStageModal({
  currentStatus,
  isOpen,
  onClose,
  onUpdateStage,
}: PayrollStageModalProps) {
  const t = useTranslations("payroll.detail");
  const [selectedStatus, setSelectedStatus] = useState<PayrollStatus>(currentStatus);

  const handleSubmit = () => {
    onUpdateStage(selectedStatus);
    toast.success(t("stageUpdatedToast", { status: selectedStatus }));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {t("stageModalTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("stageModalDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-2">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isSelected = selectedStatus === stage.status;
            const isCurrent = currentStatus === stage.status;

            return (
              <button
                key={stage.status}
                type="button"
                onClick={() => setSelectedStatus(stage.status)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`p-2 rounded-md ${stage.color} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {stage.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            className="cursor-pointer text-xs"
          >
            {t("moveStage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
