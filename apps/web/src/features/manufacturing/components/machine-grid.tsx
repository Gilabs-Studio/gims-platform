"use client";

import React from "react";
import { MachineCard } from "./machine-card";
import type { MachineItem } from "../types/oee.types";

interface MachineGridProps {
  machines: MachineItem[];
  onSelectMachine: (machine: MachineItem) => void;
}

export function MachineGrid({ machines, onSelectMachine }: MachineGridProps) {
  const runningCount = machines.filter((m) => m.status === "running").length;
  const downtimeCount = machines.filter((m) => m.status === "downtime").length;

  if (machines.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
        Tidak ada mesin yang sesuai dengan filter.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <h3 className="font-bold text-foreground">Daftar Status Mesin ({machines.length})</h3>
        <span className="text-xs text-muted-foreground">
          <strong className="text-success">{runningCount} Berjalan</strong> • <strong className="text-destructive">{downtimeCount} Down</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((mch) => (
          <MachineCard
            key={mch.id}
            machine={mch}
            onSelect={onSelectMachine}
          />
        ))}
      </div>
    </div>
  );
}
