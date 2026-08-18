"use client";

import { useTranslations } from "next-intl";
import { Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomBookingHeaderProps {
  onOpenCreateModal: () => void;
  onOpenMyBookingsDrawer: () => void;
  canCreateBooking?: boolean;
}

export function RoomBookingHeader({
  onOpenCreateModal,
  onOpenMyBookingsDrawer,
  canCreateBooking = true,
}: RoomBookingHeaderProps) {
  const t = useTranslations("roomBooking");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* TODO: connect to real permission from backend */}
        {canCreateBooking && (
          <Button
            onClick={onOpenCreateModal}
            className="cursor-pointer gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t("actions.createBooking")}</span>
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onOpenMyBookingsDrawer}
          className="cursor-pointer gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          <span>{t("actions.myBookings")}</span>
        </Button>
      </div>
    </div>
  );
}
