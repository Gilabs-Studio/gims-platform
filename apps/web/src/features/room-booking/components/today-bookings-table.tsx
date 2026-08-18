"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking } from "../types/room-booking.types";

interface TodayBookingsTableProps {
  bookings: Booking[];
  onOpenMyBookingsDrawer: () => void;
}

export function TodayBookingsTable({ bookings, onOpenMyBookingsDrawer }: TodayBookingsTableProps) {
  const t = useTranslations("roomBooking");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "confirmed":
      default:
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
    }
  };

  return (
    <Card className="h-full border border-border/60 bg-card transition-all duration-200 hover:shadow-sm">
      <div>
        <CardHeader className="flex flex-row items-center justify-between px-6 pb-3 pt-4">
          <CardTitle className="text-base font-bold text-foreground">
            {t("today.title")}
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

        <CardContent className="p-0 pb-3">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[120px] text-xs font-semibold ps-6">{t("today.columns.time")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("today.columns.title")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("today.columns.room")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("today.columns.organizer")}</TableHead>
                <TableHead className="text-xs font-semibold text-right pe-6">{t("today.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-border/40 hover:bg-accent/40 transition-colors"
                >
                  <TableCell className="text-xs font-medium text-foreground whitespace-nowrap ps-6 py-3">
                    {row.startTime} - {row.endTime}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground whitespace-nowrap py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span>{row.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                      <span className="font-medium text-foreground">{row.roomName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                          {getInitials(row.organizerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{row.organizerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right whitespace-nowrap pe-6 py-3">
                    {getStatusBadge(row.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </div>
    </Card>
  );
}
