"use client";

import { useTranslations } from "next-intl";
import { Clock, MapPin, Trash2, Calendar, CheckCircle2 } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking } from "../types/room-booking.types";

interface MyBookingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  onCancelBooking: (id: string) => void;
  canCancelBooking?: boolean;
}

export function MyBookingsDrawer({
  isOpen,
  onClose,
  bookings,
  onCancelBooking,
  canCancelBooking = true,
}: MyBookingsDrawerProps) {
  const t = useTranslations("roomBooking");

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      side="right"
      defaultWidth={480}
      title={t("modal.myBookingsTitle")}
      description="Daftar reservasi ruangan aktif atas nama Anda."
    >
      <div className="p-6 space-y-3">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground text-xs space-y-2">
            <Calendar className="h-8 w-8 stroke-1 text-muted-foreground/50" />
            <p>Anda belum memiliki reservasi aktif.</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-lg border border-border/60 bg-card space-y-2.5 shadow-2xs transition-all duration-200 hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-primary tracking-wider uppercase">
                    {b.bookingCode}
                  </span>
                  <h4 className="text-sm font-bold text-foreground">{b.title}</h4>
                </div>
                {b.status === "confirmed" ? (
                  <Badge variant="success" className="text-[10px] font-semibold px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] font-semibold px-2.5 py-0.5">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-2 font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{b.date} • {b.startTime} - {b.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{b.roomName} ({b.roomFloor})</span>
                </div>
              </div>

              {canCancelBooking && (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelBooking(b.id)}
                    className="cursor-pointer text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2.5 gap-1.5 font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t("actions.cancelBooking")}</span>
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Drawer>
  );
}
