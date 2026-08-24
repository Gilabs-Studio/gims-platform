"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Clock, Users, Filter, Sparkles } from "lucide-react";
import { Button } from "./button";
import { Switch } from "./switch";
import { Card } from "./card";
import { DatePicker } from "@/features/finance/assets/components/date-picker";

export interface RoomCalendarResource {
  id: string;
  name: string;
  code?: string;
  capacity?: number;
  status?: string;
  floor?: string;
  imageUrl?: string;
  facilitiesCount?: number;
}

export interface RoomCalendarEvent {
  id: string;
  roomId: string;
  roomName?: string;
  title: string;
  organizerName?: string;
  organizerDept?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: "confirmed" | "pending" | "in_progress" | "cancelled" | "completed" | "reserved";
  notes?: string;
}

export interface RoomCalendarProps {
  resources: RoomCalendarResource[];
  events: RoomCalendarEvent[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onSelectEvent?: (event: RoomCalendarEvent) => void;
  onSelectSlot?: (roomId: string, timeSlot: string) => void;
  startHour?: number; // e.g. 8 (08:00)
  endHour?: number; // e.g. 18 (18:00)
  className?: string;
}

// Convert "HH:mm" to total minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Format Date to YYYY-MM-DD string
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RoomCalendar({
  resources,
  events,
  selectedDate: propSelectedDate,
  onDateChange,
  onSelectEvent,
  onSelectSlot,
  startHour = 8,
  endHour = 18,
  className = "",
}: RoomCalendarProps) {
  const t = useTranslations("roomBooking");
  const [internalDate, setInternalDate] = useState<Date>(propSelectedDate || new Date());
  const [now, setNow] = useState<Date>(new Date());
  const [vacantOnly, setVacantOnly] = useState<boolean>(false);
  const [filterStartTime, setFilterStartTime] = useState<string>("09:00");
  const [filterEndTime, setFilterEndTime] = useState<string>("10:00");

  const currentDate = propSelectedDate || internalDate;

  // Real-time ticker for red timeline
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleDateChange = (newDate: Date) => {
    setInternalDate(newDate);
    onDateChange?.(newDate);
  };

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    handleDateChange(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    handleDateChange(next);
  };

  const handleToday = () => {
    handleDateChange(new Date());
  };

  const formattedDateString = formatDateKey(currentDate);

  const isToday = useMemo(() => {
    const todayStr = formatDateKey(new Date());
    return formattedDateString === todayStr;
  }, [formattedDateString]);

  // Filter events for selected date
  const dayEvents = useMemo(() => {
    return events.filter((e) => e.date === formattedDateString);
  }, [events, formattedDateString]);

  // Filter resources if Vacant Only is toggled
  const filteredResources = useMemo(() => {
    if (!vacantOnly) return resources;
    return resources.filter((res) => res.status === "available");
  }, [resources, vacantOnly]);

  const hoursList = useMemo(() => {
    const hours: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      hours.push(h);
    }
    return hours;
  }, [startHour, endHour]);

  const totalGridMinutes = (endHour - startHour) * 60;

  // Real time indicator position percentage
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60;
  const isNowWithinRange = nowMinutes >= startMinutes && nowMinutes <= endHour * 60;
  const nowPercent = isNowWithinRange
    ? ((nowMinutes - startMinutes) / totalGridMinutes) * 100
    : null;

  return (
    <Card className={`border border-border/60 bg-card shadow-sm transition-all duration-200 flex flex-col overflow-hidden ${className}`}>
      {/* 1. Reference Design Top Filter Bar */}
      <div className="p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-4 bg-muted/20">
        {/* Date Picker Controls (Today, <, >, DatePicker) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="cursor-pointer h-9 text-xs font-semibold px-3 bg-card"
          >
            {t("actions.today")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="cursor-pointer h-9 w-9 p-0 bg-card"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="cursor-pointer h-9 w-9 p-0 bg-card"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Modular DatePicker Component */}
          <div className="w-[180px]">
            <DatePicker
              value={formattedDateString}
              onChange={(val) => {
                if (val) {
                  handleDateChange(new Date(val));
                }
              }}
              placeholder={t("actions.selectDate")}
            />
          </div>
        </div>

        {/* Time Selector & Vacant Only Switch & Filter */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Time Picker Inputs */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card font-mono font-semibold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filterStartTime}
                onChange={(e) => setFilterStartTime(e.target.value)}
                className="w-12 bg-transparent text-center focus:outline-none"
              />
            </div>
            <span className="text-muted-foreground font-semibold">→</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card font-mono font-semibold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filterEndTime}
                onChange={(e) => setFilterEndTime(e.target.value)}
                className="w-12 bg-transparent text-center focus:outline-none"
              />
            </div>
          </div>

          {/* Vacant Only Switch */}
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Switch
              checked={vacantOnly}
              onCheckedChange={setVacantOnly}
              className="cursor-pointer"
            />
            <span>{t("filterOptions.vacantOnly")}</span>
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer h-9 text-xs font-semibold gap-1.5 bg-card"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("actions.moreFilter")}</span>
          </Button>
        </div>
      </div>

      {/* 2. Visual Schedule Grid & Unsplash Resource Header */}
      <div className="relative flex-1 overflow-x-auto min-h-[500px]">
        <div className="min-w-[900px] flex flex-col h-full">
          {/* Resource Header Row (Room Unsplash Photos, Name, Amenities, Capacity) */}
          <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(160px,1fr))] border-b border-border/60 bg-card sticky top-0 z-20 shadow-2xs">
            <div className="p-3 border-r border-border/60 flex flex-col items-center justify-end text-xs font-semibold text-muted-foreground bg-muted/20">
              <Clock className="h-4 w-4 mb-1" />
              <span>{t("filterOptions.timeSlot")}</span>
            </div>

            {filteredResources.map((res) => (
              <div
                key={res.id}
                className="p-3 border-r border-border/60 flex flex-col space-y-2 bg-card hover:bg-muted/10 transition-colors"
              >
                {/* Room Photo (Unsplash) */}
                <div className="relative h-24 w-full rounded-lg overflow-hidden border border-border/40 bg-muted shrink-0">
                  {res.imageUrl ? (
                    <Image
                      src={res.imageUrl}
                      alt={res.name}
                      fill
                      sizes="200px"
                      className="object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
                      {res.code}
                    </div>
                  )}
                </div>

                {/* Room Info (Name, Amenities Count, Capacity) */}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {res.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary/70" />
                      {res.facilitiesCount || 5} Facilities
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Users className="h-3 w-3" />
                      {res.capacity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Body Schedule Grid Container */}
          <div
            className="relative grid grid-cols-[100px_repeat(auto-fit,minmax(160px,1fr))] flex-1"
            style={{ minHeight: `${hoursList.length * 64}px` }}
          >
            {/* Time Axis Column */}
            <div className="border-r border-border/60 bg-muted/10 flex flex-col">
              {hoursList.map((hour) => (
                <div
                  key={hour}
                  className="h-[64px] border-b border-border/30 px-3 py-1.5 text-right text-xs font-mono font-semibold text-muted-foreground"
                >
                  {hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                </div>
              ))}
            </div>

            {/* Room Schedule Columns */}
            {filteredResources.map((res) => {
              const resEvents = dayEvents.filter((e) => e.roomId === res.id);

              return (
                <div
                  key={res.id}
                  className="relative border-r border-border/60 flex flex-col bg-card/30"
                >
                  {/* Empty Slot Cells */}
                  {hoursList.map((hour) => {
                    const timeSlot = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <div
                        key={hour}
                        onClick={() => onSelectSlot?.(res.id, timeSlot)}
                        className="h-[64px] border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer group"
                        title={`Book ${res.name} at ${timeSlot}`}
                      />
                    );
                  })}

                  {/* Render Rich Booking Event Blocks (Title + Organizer & Dept + Time) */}
                  {resEvents.map((evt) => {
                    const startMin = timeToMinutes(evt.startTime);
                    const endMin = timeToMinutes(evt.endTime);
                    const gridStartMin = startHour * 60;
                    const gridEndMin = endHour * 60;

                    const clampedStart = Math.max(startMin, gridStartMin);
                    const clampedEnd = Math.min(endMin, gridEndMin);
                    const durationMin = clampedEnd - clampedStart;

                    if (durationMin <= 0) return null;

                    const topPercent = ((clampedStart - gridStartMin) / totalGridMinutes) * 100;
                    const heightPercent = (durationMin / totalGridMinutes) * 100;

                    const isConfirmed = evt.status === "confirmed" || evt.status === "in_progress";

                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent?.(evt);
                        }}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                        className={`absolute left-1.5 right-1.5 z-10 p-2.5 rounded-lg border shadow-2xs transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between hover:scale-[1.01] hover:shadow-md ${
                          isConfirmed
                            ? "bg-success/10 border-success/30 text-success border-l-4 border-l-success"
                            : "bg-muted/50 border-border/80 text-muted-foreground border-l-4 border-l-muted-foreground/60"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          {/* Rich Title */}
                          <span className="text-xs font-bold truncate block">
                            {isConfirmed ? evt.title : t("status.unavailable")}
                          </span>

                          {/* Rich Organizer / Dept Sub-Description */}
                          {isConfirmed && evt.organizerName && (
                            <span className="text-[10px] opacity-90 truncate block font-medium">
                              {evt.organizerName} {evt.organizerDept ? `• ${evt.organizerDept}` : ""}
                            </span>
                          )}

                          {/* Time */}
                          <span className="text-[10px] font-mono font-semibold opacity-85 block pt-0.5">
                            {evt.startTime} - {evt.endTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Current Real-Time Red Indicator Line */}
            {isToday && nowPercent !== null && (
              <div
                style={{ top: `${nowPercent}%` }}
                className="absolute left-0 right-0 z-30 pointer-events-none border-t-2 border-destructive flex items-center"
              >
                <div className="h-3 w-3 rounded-full bg-destructive -ml-1.5 border-2 border-background shadow-md animate-pulse" />
                <span className="ml-1 px-1.5 py-0.5 rounded bg-destructive text-[9px] font-bold text-destructive-foreground uppercase shadow-xs">
                  Sekarang
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
