"use client";

import { useTranslations } from "next-intl";
import { Users, Sparkles, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Room, RoomStatus } from "../types/room-booking.types";

interface RoomListViewProps {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onOpenCreateModal: (room: Room) => void;
}

export function RoomListView({ rooms, onSelectRoom, onOpenCreateModal }: RoomListViewProps) {
  const t = useTranslations("roomBooking");

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.available")}
          </Badge>
        );
      case "occupied":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.occupied")}
          </Badge>
        );
      case "reserved":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.reserved")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            {t("status.unavailable")}
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => (
        <Card
          key={room.id}
          className="border border-border/60 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm flex flex-col justify-between"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-primary mb-1">
                  {room.code} • {room.floor}
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {room.name}
                </CardTitle>
              </div>
              {getStatusBadge(room.status)}
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Kapasitas: <strong className="text-foreground">{room.capacity} Orang</strong></span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {room.facilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                >
                  <Sparkles className="h-3 w-3" />
                  {fac}
                </span>
              ))}
            </div>

            {room.currentBooking && (
              <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-xs">
                <p className="font-semibold text-warning">
                  {room.currentBooking.title}
                </p>
                <p className="text-warning/90 text-[11px] mt-0.5">
                  Oleh {room.currentBooking.organizer} • s/d {room.currentBooking.endTime}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectRoom(room)}
              className="cursor-pointer text-xs flex-1"
            >
              Detail Ruangan
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenCreateModal(room)}
              className="cursor-pointer text-xs flex-1 bg-primary text-primary-foreground"
            >
              Pesan Ruang
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
