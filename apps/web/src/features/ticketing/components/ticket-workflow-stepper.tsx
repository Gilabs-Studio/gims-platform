"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, UserCheck, Wrench, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "../types/ticketing.types";

interface TicketWorkflowStepperProps {
  status: TicketStatus;
  className?: string;
}

export function TicketWorkflowStepper({ status, className }: TicketWorkflowStepperProps) {
  const t = useTranslations("ticketing");

  if (status === "rejected") {
    return (
      <div className={cn("rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive flex items-center gap-2", className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{t("stepper.rejectedMessage")}</span>
      </div>
    );
  }

  const steps = [
    {
      key: "reported",
      label: t("stepper.reported"),
      subLabel: t("stepper.subLabelReported"),
      icon: Clock,
      stepIndex: 1,
    },
    {
      key: "assigned",
      label: t("stepper.assigned"),
      subLabel: t("stepper.subLabelAssigned"),
      icon: UserCheck,
      stepIndex: 2,
    },
    {
      key: "inProgress",
      label: t("stepper.inProgress"),
      subLabel: t("stepper.subLabelInProgress"),
      icon: Wrench,
      stepIndex: 3,
    },
    {
      key: "resolved",
      label: t("stepper.resolved"),
      subLabel: t("stepper.subLabelResolved"),
      icon: CheckCircle2,
      stepIndex: 4,
    },
    {
      key: "closed",
      label: t("stepper.closed"),
      subLabel: t("stepper.subLabelClosed"),
      icon: ShieldCheck,
      stepIndex: 5,
    },
  ];

  const getActiveStepIndex = (currentStatus: TicketStatus): number => {
    switch (currentStatus) {
      case "open":
        return 1;
      case "assigned":
        return 2;
      case "in_progress":
      case "pending_parts":
        return 3;
      case "resolved":
        return 4;
      case "closed":
        return 5;
      default:
        return 1;
    }
  };

  const currentIndex = getActiveStepIndex(status);

  return (
    <div className={cn("w-full py-2", className)}>
      <div className="relative w-full">
        {/* Step Icons Row Container with Connecting Line */}
        <div className="relative flex items-center justify-between w-full">
          {/* Background Connecting Line (Centered vertically at top-1/2 of 40px icon height) */}
          <div className="absolute left-5 right-5 top-5 -translate-y-1/2 h-0.5 bg-muted z-0" />

          {/* Active Progress Line */}
          <div
            className="absolute left-5 top-5 -translate-y-1/2 h-0.5 bg-primary transition-all duration-500 z-0"
            style={{
              width: `calc(${((currentIndex - 1) / (steps.length - 1)) * 100}% - 20px + ${currentIndex === steps.length ? "20px" : "10px"})`,
            }}
          />

          {steps.map((step) => {
            const isCompleted = step.stepIndex < currentIndex;
            const isCurrent = step.stepIndex === currentIndex;
            const StepIcon = step.icon;

            return (
              <div
                key={step.key}
                className="relative z-10 flex flex-col items-center group cursor-pointer w-20"
              >
                {/* Circle Icon Container - Explicit style borderRadius 9999px to bypass global capped rounded-full */}
                <div
                  style={{ borderRadius: "9999px" }}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center border-2 text-xs font-semibold transition-all duration-300 bg-background shrink-0",
                    isCompleted && "border-primary bg-primary text-primary-foreground shadow-sm",
                    isCurrent && "border-primary bg-background text-primary ring-4 ring-primary/20 scale-105 font-bold shadow-md",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>

                <div className="mt-2 text-center w-full">
                  <p
                    className={cn(
                      "text-[11px] font-medium leading-tight whitespace-nowrap",
                      isCurrent && "text-primary font-bold",
                      isCompleted && "text-foreground font-semibold",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground hidden sm:block mt-0.5 truncate">
                    {step.subLabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
