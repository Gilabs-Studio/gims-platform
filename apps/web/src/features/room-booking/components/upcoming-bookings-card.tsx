"use client";

import { useTranslations } from "next-intl";
import { MoreVertical, Calendar, Clock, MapPin, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Booking } from "../types/room-booking.types";

interface UpcomingBookingsCardProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onOpenMyBookingsDrawer: () => void;
  canCancelBooking?: boolean;
}

export function UpcomingBookingsCard({
  bookings,
  onCancelBooking,
  onOpenMyBookingsDrawer,
  canCancelBooking = true,
}: UpcomingBookingsCardProps) {
  const t = useTranslations("roomBooking");

  return (
    <Card className="h-full border border-border/60 bg-card transition-all duration-200 hover:shadow-sm flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pb-3 pt-4">
        <CardTitle className="text-base font-bold text-foreground">
          {t("upcoming.title")}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMyBookingsDrawer}
          className="cursor-pointer h-8 text-xs"
        >
          {t("actions.viewAll")}
        </Button>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2 flex-1 overflow-y-auto space-y-3">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground text-xs space-y-2">
            <Calendar className="h-8 w-8 stroke-1 text-muted-foreground/50" />
            <p>{t("upcoming.noUpcoming")}</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className="group p-3 rounded-lg border border-border/60 bg-card hover:bg-accent/40 transition-all duration-200 flex items-center justify-between gap-3"
            >
              {/* Date Box */}
              <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary shrink-0 font-bold">
                <span className="text-[10px] tracking-wider uppercase leading-none">
                  {booking.monthShort || "JUN"}
                </span>
                <span className="text-base leading-tight mt-0.5">
                  {booking.dayNumber || "01"}
                </span>
              </div>

              {/* Booking Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {booking.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                  <span>{booking.startTime} - {booking.endTime}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                  <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{booking.roomName} ({booking.roomFloor})</span>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {booking.status === "confirmed" ? (
                  <Badge variant="success" className="text-[11px] font-medium">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[11px] font-medium">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {/* TODO: connect to real permission from backend */}
                    {canCancelBooking && (
                      <DropdownMenuItem
                        onClick={() => onCancelBooking(booking.id)}
                        className="cursor-pointer text-destructive focus:text-destructive text-xs gap-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Batalkan Booking</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
