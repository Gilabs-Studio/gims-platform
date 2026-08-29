"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { MachineStatus } from "../types/machine.types";

interface MachineStatusBadgeProps {
  status: MachineStatus;
  className?: string;
}

export function MachineStatusBadge({
  status,
  className = "",
}: MachineStatusBadgeProps) {
  const t = useTranslations("manufacturingMachines.status");

  const getSolidBadgeClass = () => {
    switch (status) {
      case "running":
        return "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent";
      case "downtime":
        return "bg-rose-600 hover:bg-rose-600 text-white border-transparent";
      case "idle":
        return "bg-amber-600 hover:bg-amber-600 text-white border-transparent";
      case "maintenance":
        return "bg-indigo-600 hover:bg-indigo-600 text-white border-transparent";
      default:
        return "bg-muted text-muted-foreground border-transparent";
    }
  };

  return (
    <Badge
      className={`font-semibold px-2.5 py-0.5 shadow-none text-xs ${getSolidBadgeClass()} ${className}`}
    >
      {t(status)}
    </Badge>
  );
}
