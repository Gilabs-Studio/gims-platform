"use client";

import { useTranslations } from "next-intl";
import { Users, Sparkles, Building, CalendarPlus, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Room } from "../types/room-booking.types";

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onBookRoom: (room: Room) => void;
  canCreateBooking?: boolean;
}

export function RoomDetailModal({
  isOpen,
  onClose,
  room,
  onBookRoom,
  canCreateBooking = true,
}: RoomDetailModalProps) {
  const t = useTranslations("roomBooking");

  if (!room) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              {room.code} • {room.floor}
            </span>
            {room.status === "available" ? (
              <Badge variant="success" className="text-xs font-medium">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("status.available")}
              </Badge>
            ) : room.status === "occupied" ? (
              <Badge variant="warning" className="text-xs font-medium">
                <Clock className="h-3 w-3 mr-1" />
                {t("status.occupied")}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs font-medium">
                <XCircle className="h-3 w-3 mr-1" />
                {t("status.reserved")}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {room.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Location & Capacity */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
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

          {/* Description */}
          {room.description && (
            <div>
              <h4 className="font-bold text-foreground mb-1">Deskripsi</h4>
              <p className="text-muted-foreground leading-relaxed">{room.description}</p>
            </div>
          )}

          {/* Facilities */}
          <div>
            <h4 className="font-bold text-foreground mb-2">Fasilitas Ruangan</h4>
            <div className="flex flex-wrap gap-1.5">
              {room.facilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-muted text-foreground border border-border/40"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Current Booking Notice */}
          {room.currentBooking && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
              <p className="font-bold">Sedang Digunakan Saat Ini:</p>
              <p className="font-semibold mt-0.5">{room.currentBooking.title}</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Oleh {room.currentBooking.organizer} • Berakhir jam {room.currentBooking.endTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            {t("actions.cancel")}
          </Button>

          {/* TODO: connect to real permission from backend */}
          {canCreateBooking && (
            <Button
              onClick={() => {
                onClose();
                onBookRoom(room);
              }}
              className="cursor-pointer text-xs bg-primary text-primary-foreground gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>{t("actions.bookThisRoom")}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
