"use client";

import { useTranslations } from "next-intl";
import { Building2, CalendarCheck, Users, ClipboardList, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RoomBookingStats } from "../types/room-booking.types";

interface RoomBookingStatsCardsProps {
  stats: RoomBookingStats;
}

export function RoomBookingStatsCards({ stats }: RoomBookingStatsCardsProps) {
  const t = useTranslations("roomBooking.stats");

  const cards = [
    {
      title: t("totalRoom"),
      value: stats.totalRooms.toString(),
      subtext: t("allLocations"),
      isBadge: false,
      badgeClass: "text-muted-foreground font-medium",
      icon: Building2,
      iconBg: "bg-primary/10 text-primary",
    },
    {
      title: t("availableToday"),
      value: stats.availableToday.toString(),
      subtext: t("availablePercentage", { pct: stats.availablePercentage }),
      isBadge: true,
      badgeClass: "bg-success/15 text-success font-semibold",
      icon: CalendarCheck,
      iconBg: "bg-success/10 text-success",
    },
    {
      title: t("occupiedNow"),
      value: stats.occupiedNow.toString(),
      subtext: t("occupiedPercentage", { pct: stats.occupiedPercentage }),
      isBadge: true,
      badgeClass: "bg-warning/15 text-warning font-semibold",
      icon: Users,
      iconBg: "bg-warning/10 text-warning",
    },
    {
      title: t("bookingsToday"),
      value: stats.bookingsToday.toString(),
      subtext: t("totalScheduledBookings"),
      isBadge: false,
      badgeClass: "text-muted-foreground font-medium",
      icon: ClipboardList,
      iconBg: "bg-purple/10 text-purple",
    },
    {
      title: t("cancellationsToday"),
      value: stats.cancellationsToday.toString(),
      subtext: t("fromTotalBookings", { pct: stats.cancellationPercentage }),
      isBadge: true,
      badgeClass: "bg-rose/15 text-rose font-semibold",
      icon: CheckCircle2,
      iconBg: "bg-rose/10 text-rose",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={index}
            className="relative overflow-hidden border border-border/60 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <CardContent className="p-0 flex flex-col justify-between h-full space-y-3">
              {/* Top Row: Icon Container */}
              <div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <IconComponent className="h-4.5 w-4.5" />
                </div>
              </div>

              {/* Title & Numeric Value */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl tabular-nums">
                  {card.value}
                </p>
              </div>

              {/* Bottom Subtext / Badge */}
              <div>
                {card.isBadge ? (
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] tabular-nums ${card.badgeClass}`}>
                    {card.subtext}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {card.subtext}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
