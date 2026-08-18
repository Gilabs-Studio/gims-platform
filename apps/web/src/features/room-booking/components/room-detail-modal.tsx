"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Users, Building, CalendarPlus, CheckCircle2, PlayCircle, AlertCircle } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Room, Booking } from "../types/room-booking.types";

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  bookings?: Booking[];
  onBookRoom: (room: Room) => void;
  canCreateBooking?: boolean;
}

export function RoomDetailModal({
  isOpen,
  onClose,
  room,
  bookings = [],
  onBookRoom,
  canCreateBooking = true,
}: RoomDetailModalProps) {
  const t = useTranslations("roomBooking");

  // Filter today's bookings for the selected room
  const todayRoomBookings = useMemo(() => {
    if (!room) return [];
    return bookings.filter((b) => b.roomId === room.id);
  }, [room, bookings]);

  if (!room) return null;

  const getStatusBadge = (status: Room["status"]) => {
    switch (status) {
      case "available":
        return (
          <Badge variant="success" className="text-xs font-semibold px-3 py-1 rounded-md">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.available")}
          </Badge>
        );
      case "occupied":
        return (
          <Badge variant="warning" className="text-xs font-semibold px-3 py-1 rounded-md">
            <PlayCircle className="h-3 w-3 mr-1.5" />
            {t("status.occupied")}
          </Badge>
        );
      case "reserved":
        return (
          <Badge variant="destructive" className="text-xs font-semibold px-3 py-1 rounded-md">
            <AlertCircle className="h-3 w-3 mr-1.5" />
            {t("status.reserved")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-md">
            {t("status.unavailable")}
          </Badge>
        );
    }
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      side="right"
      defaultWidth={520}
      title={room.name}
      description={`${room.code} • ${room.floor} • ${room.location}`}
      headerExtra={getStatusBadge(room.status)}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="p-6 space-y-6 text-xs">
          {/* Room Unsplash Photo Cover */}
          {room.imageUrl && (
            <div className="relative h-48 w-full rounded-xl overflow-hidden border border-border/40 shadow-xs">
              <Image
                src={room.imageUrl}
                alt={room.name}
                fill
                sizes="500px"
                className="object-cover"
              />
            </div>
          )}

          {/* Quick Info Badges */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Lokasi</p>
                <p className="font-semibold text-foreground truncate">{room.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Kapasitas</p>
                <p className="font-semibold text-foreground">{room.capacity} Orang</p>
              </div>
            </div>
          </div>

          {/* Active Session Notice */}
          {room.currentBooking && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-warning uppercase text-[10px] tracking-wider">
                  Sesi Aktif Sekarang
                </span>
                <span className="h-2 w-2 rounded-full bg-warning animate-ping" />
              </div>
              <h4 className="font-bold text-foreground text-sm">
                {room.currentBooking.title}
              </h4>
              <div className="flex items-center justify-between text-muted-foreground text-[11px] pt-1 border-t border-warning/20">
                <span>Oleh: <strong className="text-foreground">{room.currentBooking.organizer}</strong></span>
                <span className="font-mono font-semibold text-warning">s/d {room.currentBooking.endTime}</span>
              </div>
            </div>
          )}

          {/* Super Minimalist Facilities Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
              Fasilitas Ruangan
            </h4>
            <div className="flex flex-wrap gap-2">
              {room.facilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border/30"
                >
                  {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {room.description && (
            <div className="space-y-1.5 pt-2 border-t border-border/30">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
                Deskripsi
              </h4>
              <p className="text-muted-foreground leading-relaxed">{room.description}</p>
            </div>
          )}

          {/* Today's Schedule Timeline */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
                Jadwal Ruangan Hari Ini
              </h4>
              <span className="text-[11px] font-semibold text-primary">{todayRoomBookings.length} Sesi</span>
            </div>

            {todayRoomBookings.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                Belum ada booking terjadwal untuk ruangan ini hari ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayRoomBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {b.organizerName} {b.organizerDept ? `• ${b.organizerDept}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] font-bold text-primary block">
                        {b.startTime} - {b.endTime}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize font-medium">{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-6 border-t border-border/40 bg-muted/10">
          {canCreateBooking && (
            <Button
              onClick={() => {
                onClose();
                onBookRoom(room);
              }}
              className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 shadow-sm transition-all hover:shadow-md rounded-lg gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>{t("actions.bookThisRoom")}</span>
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
