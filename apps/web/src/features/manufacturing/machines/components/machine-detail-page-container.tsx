"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { useMachineDetail } from "../hooks/use-machine-detail";
import { MachineDetailView } from "./machine-detail-view";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

interface MachineDetailPageContainerProps {
  id: string;
}

export function MachineDetailPageContainer({ id }: MachineDetailPageContainerProps) {
  const { machine, isLoading, isError, updateStatus, isUpdatingStatus } =
    useMachineDetail(id);

  if (isLoading) {
    return (
      <PageMotion className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </PageMotion>
    );
  }

  if (isError || !machine) {
    return (
      <PageMotion className="space-y-6">
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3 bg-card">
          <h2 className="text-base font-semibold text-foreground">Mesin Tidak Ditemukan</h2>
          <p className="text-xs text-muted-foreground">
            Mesin dengan identitas &quot;{id}&quot; tidak ditemukan dalam database atau telah dihapus.
          </p>
          <div className="pt-2">
            <Link
              href="/manufacturing/machines"
              className="inline-flex h-9 items-center px-4 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors cursor-pointer"
            >
              ← Kembali ke Daftar Mesin
            </Link>
          </div>
        </div>
      </PageMotion>
    );
  }

  return (
    <MachineDetailView
      machine={machine}
      onUpdateStatus={updateStatus}
      isUpdatingStatus={isUpdatingStatus}
    />
  );
}
