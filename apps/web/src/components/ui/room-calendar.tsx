"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Plus,
  Search,
  CalendarDays,
  Check,
  MapPin,
  X,
  Filter,
  ChevronDown,
  Calendar as CalendarIcon,
  Map,
} from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";

export interface RoomCalendarResource {
  id: string;
  name: string;
  code?: string;
  capacity?: number;
  status?: string;
  floor?: string;
  imageUrl?: string;
  facilitiesCount?: number;
  color?: string;
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
  participantsCount?: number;
}

export interface RoomCalendarProps {
  resources: RoomCalendarResource[];
  events: RoomCalendarEvent[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onSelectEvent?: (event: RoomCalendarEvent) => void;
  onSelectSlot?: (roomId: string, timeSlot: string) => void;
  onOpenCreateModal?: () => void;
  onOpenMyBookingsDrawer?: () => void;
  onToggleVisualMap?: () => void;
  isMapActive?: boolean;
  startHour?: number; // e.g. 7 (07:00)
  endHour?: number; // e.g. 20 (20:00 / 8 PM)
  className?: string;
}

export type CalendarViewMode = "day" | "week" | "month";

// Soft pastel color palette for rooms & event blocks matching reference design
const ROOM_PASTEL_COLORS = [
  {
    dot: "bg-blue-500",
    hex: "#3b82f6",
    cardBg: "bg-blue-50/90 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 border-blue-200/80 dark:border-blue-800/60",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
  },
  {
    dot: "bg-emerald-500",
    hex: "#10b981",
    cardBg: "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-200/80 dark:border-emerald-800/60",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  },
  {
    dot: "bg-purple-500",
    hex: "#a855f7",
    cardBg: "bg-purple-50/90 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 border-purple-200/80 dark:border-purple-800/60",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  },
  {
    dot: "bg-amber-500",
    hex: "#f59e0b",
    cardBg: "bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-amber-200/80 dark:border-amber-800/60",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  },
  {
    dot: "bg-cyan-500",
    hex: "#06b6d4",
    cardBg: "bg-cyan-50/90 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 border-cyan-200/80 dark:border-cyan-800/60",
    badgeBg: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200",
  },
  {
    dot: "bg-rose-500",
    hex: "#f43f5e",
    cardBg: "bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-200/80 dark:border-rose-800/60",
    badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  },
];

// Helper: Convert "HH:mm" to total minutes
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper: Format Date to YYYY-MM-DD
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: Get start of week (Sunday or Monday based)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Helper: Format hour (7 AM up to 8 PM)
function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

// Helper: Format duration text
function formatDuration(startTime: string, endTime: string): string {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const diffMin = Math.max(0, endMin - startMin);
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function RoomCalendar({
  resources,
  events,
  selectedDate: propSelectedDate,
  onDateChange,
  onSelectEvent,
  onSelectSlot,
  onOpenCreateModal,
  onOpenMyBookingsDrawer,
  onToggleVisualMap,
  isMapActive = false,
  startHour = 7,
  endHour = 20,
  className = "",
}: RoomCalendarProps) {
  const t = useTranslations("roomBooking");
  const [internalDate, setInternalDate] = useState<Date>(propSelectedDate || new Date());
  const [miniCalDate, setMiniCalDate] = useState<Date>(propSelectedDate || new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [now, setNow] = useState<Date>(new Date());
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(
    () => new Set(resources.map((r) => r.id))
  );

  // Selected event for Right Details Sidebar
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sync selectedRoomIds size when resources count changes during render
  const [prevResourcesLength, setPrevResourcesLength] = useState(resources.length);
  if (resources.length !== prevResourcesLength) {
    setPrevResourcesLength(resources.length);
    setSelectedRoomIds(new Set(resources.map((r) => r.id)));
  }

  const currentDate = propSelectedDate || internalDate;

  // Ticker for live red line
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleDateChange = (newDate: Date) => {
    setInternalDate(newDate);
    setMiniCalDate(newDate);
    onDateChange?.(newDate);
  };

  const handleToday = () => {
    handleDateChange(new Date());
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") next.setDate(next.getDate() - 1);
    else if (viewMode === "week") next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    handleDateChange(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") next.setDate(next.getDate() + 1);
    else if (viewMode === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    handleDateChange(next);
  };

  const formattedDateString = formatDateKey(currentDate);
  const todayStr = formatDateKey(now);
  const isToday = formattedDateString === todayStr;

  // Resources mapped with pastel colors
  const resourcesWithColors = useMemo(() => {
    return resources.map((res, index) => {
      const colorObj = ROOM_PASTEL_COLORS[index % ROOM_PASTEL_COLORS.length];
      return { ...res, colorObj };
    });
  }, [resources]);

  // Filtered resources by search
  const filteredResources = useMemo(() => {
    return resourcesWithColors.filter((res) => {
      if (selectedRoomIds.size > 0 && !selectedRoomIds.has(res.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = res.name.toLowerCase().includes(q);
        const matchCode = res.code?.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [resourcesWithColors, selectedRoomIds, searchQuery]);

  // Generate 7-day week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    const days: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateKey(d);
      days.push({
        date: d,
        dateStr,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Hours list (07:00 -> 20:00 / 8 PM)
  const hoursList = useMemo(() => {
    const hours: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      hours.push(h);
    }
    return hours;
  }, [startHour, endHour]);

  const totalGridMinutes = (endHour - startHour) * 60;

  // Calculate live red line percentage position
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60;
  const isNowWithinRange = nowMinutes >= startMinutes && nowMinutes <= endHour * 60;
  const nowPercent = isNowWithinRange
    ? ((nowMinutes - startMinutes) / totalGridMinutes) * 100
    : null;

  // Mini Month Calendar calculation
  const miniCalDays = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDay = firstDay.getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { dayNum: number; isCurrentMonth: boolean; date: Date; dateStr: string }[] = [];

    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        dayNum: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: prevDate,
        dateStr: formatDateKey(prevDate),
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currDate = new Date(year, month, i);
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        date: currDate,
        dateStr: formatDateKey(currDate),
      });
    }

    const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        date: nextDate,
        dateStr: formatDateKey(nextDate),
      });
    }

    return days;
  }, [miniCalDate]);

  // Toggle room selection
  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        if (next.size > 1) next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  // Header date range string
  const headerDateLabel = useMemo(() => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      const startMonth = start.toLocaleDateString("en-US", { month: "short" });
      const endMonth = end.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [viewMode, currentDate, weekDays]);

  // Active selected event object for the right sidebar
  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      const found = events.find((e) => e.id === selectedEventId);
      if (found) return found;
    }
    return events[0] || null;
  }, [selectedEventId, events]);

  // Upcoming bookings list for the right sidebar
  const upcomingEvents = useMemo(() => {
    return events.slice(0, 4);
  }, [events]);

  // Dynamic CSS Grid Columns style for Day View to guarantee rooms NEVER wrap to a second row
  const dayGridColsStyle = useMemo(() => {
    const colCount = Math.max(1, filteredResources.length);
    return {
      gridTemplateColumns: `65px repeat(${colCount}, minmax(180px, 1fr))`,
    };
  }, [filteredResources.length]);

  return (
    <div className={`w-full h-full max-h-[calc(100vh-1px)] flex bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden ${className}`}>
      {/* ========================================================================= */}
      {/* COLUMN 1: LEFT ANCHORED SIDEBAR                                          */}
      {/* ========================================================================= */}
      <aside className="w-[280px] h-full flex flex-col justify-between border-r border-border/60 bg-background/50 p-4 space-y-3 shrink-0 overflow-hidden">
        {/* Title */}
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-[11px] text-muted-foreground font-medium leading-tight">
            {t("subtitle")}
          </p>
        </div>

        {/* Full-width + New Booking Primary Button */}
        <Button
          onClick={() => onOpenCreateModal?.()}
          className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>{t("actions.createBooking")}</span>
        </Button>

        {/* Mini Month Calendar */}
        <div className="space-y-2 bg-card p-3 rounded-xl border border-border/40 shadow-2xs shrink-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground">
              {miniCalDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  const prev = new Date(miniCalDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setMiniCalDate(prev);
                }}
                className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  const next = new Date(miniCalDate);
                  next.setMonth(next.getMonth() + 1);
                  setMiniCalDate(next);
                }}
                className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {miniCalDays.map((d, idx) => {
              const isSelected = d.dateStr === formattedDateString;
              const isTodayCell = d.dateStr === todayStr;

              return (
                <button
                  key={idx}
                  onClick={() => handleDateChange(d.date)}
                  className={`cursor-pointer h-6 w-6 mx-auto rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : isTodayCell
                      ? "border border-primary text-primary font-bold"
                      : d.isCurrentMonth
                      ? "text-foreground hover:bg-muted"
                      : "text-muted-foreground/40 hover:bg-muted/50"
                  }`}
                >
                  {d.dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="relative shrink-0">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("sidebar.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-card rounded-lg border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Issue 4 Fix: ROOMS Section fills all available vertical space down to the Visual Map button */}
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 sticky top-0 bg-background/90 backdrop-blur-xs py-1 z-10">
            <span>ROOMS ({resources.length})</span>
            <button
              onClick={() => onOpenCreateModal?.()}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {resourcesWithColors.map((res) => {
              const isChecked = selectedRoomIds.has(res.id);
              return (
                <button
                  key={res.id}
                  onClick={() => toggleRoomSelection(res.id)}
                  className={`cursor-pointer w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-all ${
                    isChecked ? "bg-card hover:bg-accent text-foreground border border-border/40" : "text-muted-foreground opacity-50 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative h-7 w-7 rounded-md overflow-hidden bg-muted border border-border/40 shrink-0">
                      {res.imageUrl ? (
                        <Image src={res.imageUrl} alt={res.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-primary bg-primary/10">
                          {res.code?.slice(0, 2) || "RM"}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col text-left truncate">
                      <span className="font-semibold text-xs text-foreground truncate">{res.name}</span>
                      <span className="text-[10px] text-muted-foreground">{res.capacity} seats</span>
                    </div>
                  </div>
                  <Users className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Switcher Button */}
        <Button
          variant="outline"
          onClick={() => onToggleVisualMap?.()}
          className="w-full h-9 text-xs font-semibold gap-2 border-border/60 bg-card hover:bg-accent cursor-pointer transition-all shrink-0 mt-auto"
        >
          {isMapActive ? (
            <>
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>{t("tabs.calendarSchedule")}</span>
            </>
          ) : (
            <>
              <Map className="h-4 w-4 text-primary" />
              <span>{t("tabs.floorMap")}</span>
            </>
          )}
        </Button>
      </aside>

      {/* ========================================================================= */}
      {/* COLUMN 2: CENTER CALENDAR GRID                                            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background/30">
        {/* Center Header Toolbar */}
        <div className="p-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs font-medium px-3 bg-card border-border/60 hover:bg-accent cursor-pointer"
            >
              {t("actions.today")}
            </Button>

            <div className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 w-8 p-0 border-border/60 bg-card hover:bg-accent cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="h-8 w-8 p-0 border-border/60 bg-card hover:bg-accent cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="flex items-center gap-1 cursor-pointer">
              <h2 className="text-sm font-bold text-foreground">
                {headerDateLabel}
              </h2>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5 text-xs">
              <button
                onClick={() => setViewMode("day")}
                className={`cursor-pointer px-3 py-1 rounded-md font-medium text-xs transition-all ${
                  viewMode === "day"
                    ? "bg-card text-foreground shadow-2xs font-bold border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabs.dayView")}
              </button>

              <button
                onClick={() => setViewMode("week")}
                className={`cursor-pointer px-3 py-1 rounded-md font-medium text-xs transition-all ${
                  viewMode === "week"
                    ? "bg-card text-foreground shadow-2xs font-bold border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabs.weekView")}
              </button>

              <button
                onClick={() => setViewMode("month")}
                className={`cursor-pointer px-3 py-1 rounded-md font-medium text-xs transition-all ${
                  viewMode === "month"
                    ? "bg-card text-foreground shadow-2xs font-bold border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabs.monthView")}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium gap-1.5 border-border/60 bg-card hover:bg-accent cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("actions.filter")}</span>
            </Button>
          </div>
        </div>

        {/* DAY VIEW MODE (Issue 1 & 2 Fix: Unified single-scroll canvas, room headers NEVER wrap) */}
        {viewMode === "day" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">
              <div className="inline-block min-w-full align-top">
                {/* Room Headers Row */}
                <div
                  style={dayGridColsStyle}
                  className="grid sticky top-0 z-20 border-b border-border/60 bg-card shadow-2xs"
                >
                  <div className="p-3 border-r border-border/60 flex items-center justify-center text-[10px] font-mono font-semibold text-muted-foreground bg-card">
                    <Clock className="h-4 w-4" />
                  </div>
                  {filteredResources.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 border-r border-border/60 flex items-center justify-between bg-card shrink-0 min-w-[180px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="relative h-6 w-6 rounded-md overflow-hidden bg-muted border border-border/40 shrink-0">
                          {res.imageUrl ? (
                            <Image src={res.imageUrl} alt={res.name} fill sizes="40px" className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-primary bg-primary/10">
                              {res.code?.slice(0, 2) || "RM"}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-foreground truncate">{res.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        {res.capacity} seats
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Schedule Grid Canvas */}
                <div
                  style={dayGridColsStyle}
                  className="relative grid min-h-full"
                >
                  {/* Time Column Axis */}
                  <div className="border-r border-border/60 bg-muted/10 flex flex-col">
                    {hoursList.map((hour) => (
                      <div
                        key={hour}
                        className="h-[52px] border-b border-border/30 px-2 py-1 text-right text-[10px] font-mono font-semibold text-muted-foreground"
                      >
                        {formatHourLabel(hour)}
                      </div>
                    ))}
                  </div>

                  {/* Room Column Grids */}
                  {filteredResources.map((res) => {
                    const resEvents = events.filter((e) => e.date === formattedDateString && e.roomId === res.id);
                    return (
                      <div key={res.id} className="relative border-r border-border/40 flex flex-col bg-card/20 min-w-[180px]">
                        {hoursList.map((hour) => {
                          const timeSlot = `${String(hour).padStart(2, "0")}:00`;
                          return (
                            <div
                              key={hour}
                              onClick={() => onSelectSlot?.(res.id, timeSlot)}
                              className="h-[52px] border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                            />
                          );
                        })}

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

                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventId(evt.id);
                                onSelectEvent?.(evt);
                              }}
                              style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
                              className={`absolute left-1 right-1 z-10 p-2 rounded-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${res.colorObj.cardBg}`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-xs font-bold truncate leading-tight">{evt.title}</h4>
                                <p className="text-[10px] font-medium opacity-85 truncate">{evt.startTime} – {evt.endTime}</p>
                              </div>
                              <div className="flex items-center justify-end">
                                <span className="text-[9px] font-bold flex items-center gap-0.5 opacity-80">
                                  <Users className="h-2.5 w-2.5" />
                                  {evt.participantsCount || res.capacity || 8}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Live Red Line for Today */}
                  {isToday && nowPercent !== null && (
                    <div
                      style={{ top: `${nowPercent}%` }}
                      className="absolute left-0 right-0 z-30 pointer-events-none -translate-y-1/2 flex items-center"
                    >
                      <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5 border-2 border-background shadow-xs shrink-0 z-10" />
                      <div className="w-full border-t-2 border-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WEEK VIEW MODE */}
        {viewMode === "week" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">
              <div className="inline-block min-w-full align-top">
                <div className="grid grid-cols-[65px_repeat(7,minmax(130px,1fr))] border-b border-border/60 bg-card text-center sticky top-0 z-20 shadow-2xs">
                  <div className="p-3 border-r border-border/60 flex items-center justify-center text-[10px] font-mono font-semibold text-muted-foreground bg-card">
                    GMT+07
                  </div>
                  {weekDays.map((d) => (
                    <div
                      key={d.dateStr}
                      onClick={() => handleDateChange(d.date)}
                      className={`p-2 border-r border-border/60 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        d.dateStr === formattedDateString ? "bg-primary/5" : "hover:bg-muted/10"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {d.dayName}
                      </span>
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                          d.isToday
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : d.dateStr === formattedDateString
                            ? "border border-primary text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {d.dayNum}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative grid grid-cols-[65px_repeat(7,minmax(130px,1fr))] min-h-full">
                  <div className="border-r border-border/60 bg-muted/10 flex flex-col">
                    {hoursList.map((hour) => (
                      <div
                        key={hour}
                        className="h-[52px] border-b border-border/30 px-2 py-1 text-right text-[10px] font-mono font-semibold text-muted-foreground"
                      >
                        {formatHourLabel(hour)}
                      </div>
                    ))}
                  </div>

                  {weekDays.map((d) => {
                    const dayEvts = events.filter((e) => e.date === d.dateStr);

                    return (
                      <div
                        key={d.dateStr}
                        className={`relative border-r border-border/40 flex flex-col ${
                          d.dateStr === formattedDateString ? "bg-primary/5" : "bg-card/20"
                        }`}
                      >
                        {hoursList.map((hour) => {
                          const timeSlot = `${String(hour).padStart(2, "0")}:00`;
                          const defaultRoomId = filteredResources[0]?.id || "";
                          return (
                            <div
                              key={hour}
                              onClick={() => onSelectSlot?.(defaultRoomId, timeSlot)}
                              className="h-[52px] border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                            />
                          );
                        })}

                        {dayEvts.map((evt) => {
                          const targetRoom = resourcesWithColors.find((r) => r.id === evt.roomId) || resourcesWithColors[0];
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
                          const colorObj = targetRoom?.colorObj || ROOM_PASTEL_COLORS[0];
                          const isSelected = selectedEventId === evt.id;

                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventId(evt.id);
                                onSelectEvent?.(evt);
                              }}
                              style={{
                                top: `${topPercent}%`,
                                height: `${heightPercent}%`,
                              }}
                              className={`absolute left-1 right-1 z-10 p-2 rounded-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between hover:shadow-md ${colorObj.cardBg} ${
                                isSelected ? "ring-2 ring-primary shadow-md scale-[1.01]" : ""
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-xs font-bold truncate leading-tight">
                                  {evt.title}
                                </h4>
                                <p className="text-[10px] font-medium opacity-85 truncate">
                                  {evt.startTime} – {evt.endTime}
                                </p>
                                <p className="text-[10px] font-semibold opacity-90 truncate">
                                  {targetRoom?.name}
                                </p>
                              </div>

                              <div className="flex items-center justify-end">
                                <span className="text-[9px] font-bold flex items-center gap-0.5 opacity-80 bg-background/40 px-1.5 py-0.5 rounded-md">
                                  <Users className="h-2.5 w-2.5" />
                                  {evt.participantsCount || targetRoom?.capacity || 8}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {nowPercent !== null && (
                    <div
                      style={{ top: `${nowPercent}%` }}
                      className="absolute left-0 right-0 z-30 pointer-events-none -translate-y-1/2 flex items-center"
                    >
                      <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5 border-2 border-background shadow-xs shrink-0 z-10" />
                      <div className="w-full border-t-2 border-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MONTH VIEW MODE */}
        {viewMode === "month" && (
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 h-full">
            <div className="grid grid-cols-7 border-b border-border/60 bg-card text-center text-[10px] font-bold text-muted-foreground py-2 shrink-0">
              <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {miniCalDays.map((d, idx) => {
                const dayEvts = events.filter((e) => e.date === d.dateStr);
                const isSelected = d.dateStr === formattedDateString;
                const isTodayCell = d.dateStr === todayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateChange(d.date)}
                    className={`min-h-[90px] p-1.5 border-r border-b border-border/40 flex flex-col gap-1 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5" : d.isCurrentMonth ? "bg-card hover:bg-muted/10" : "bg-muted/20 opacity-40"
                    }`}
                  >
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isTodayCell ? "bg-primary text-primary-foreground" : "text-foreground"
                    }`}>
                      {d.dayNum}
                    </span>
                    <div className="space-y-1 overflow-y-auto">
                      {dayEvts.slice(0, 2).map((evt) => {
                        const targetRoom = resourcesWithColors.find((r) => r.id === evt.roomId) || resourcesWithColors[0];
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventId(evt.id);
                              onSelectEvent?.(evt);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold truncate ${targetRoom.colorObj.cardBg}`}
                          >
                            {evt.startTime} {evt.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT ANCHORED DETAILS & UPCOMING PANEL                         */}
      {/* ========================================================================= */}
      <aside className="w-[310px] h-full flex flex-col justify-between border-l border-border/60 bg-background/50 p-4 space-y-4 shrink-0 overflow-hidden min-h-0">
        {/* Booking Details Section */}
        {activeEvent ? (
          <div className="space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Booking Details</h3>
              <button
                onClick={() => setSelectedEventId(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 bg-card p-3.5 rounded-xl border border-border/50 shadow-2xs">
              <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-xs font-semibold">
                <Check className="h-3 w-3 stroke-[3]" />
                <span>Confirmed</span>
              </Badge>

              <h2 className="text-base font-bold text-foreground tracking-tight leading-snug">
                {activeEvent.title}
              </h2>

              <div className="space-y-2 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    {new Date(activeEvent.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    {activeEvent.startTime} – {activeEvent.endTime} ({formatDuration(activeEvent.startTime, activeEvent.endTime)})
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    {activeEvent.roomName || "Meeting Room A"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    {activeEvent.participantsCount || 8} participants
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs cursor-pointer shadow-xs">
                  Edit Booking
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-8 text-xs font-semibold border-border/60 bg-card hover:bg-accent text-destructive cursor-pointer"
                >
                  Cancel Booking
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border/40 shrink-0">
            Select an event on the calendar to view full details.
          </div>
        )}

        {/* UPCOMING BOOKINGS Section */}
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-0.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 sticky top-0 bg-background/80 backdrop-blur-xs py-0.5 z-10">
            UPCOMING BOOKINGS
          </h4>

          <div className="space-y-2">
            {upcomingEvents.map((evt, idx) => {
              const targetRoom = resourcesWithColors.find((r) => r.id === evt.roomId) || resourcesWithColors[idx % resourcesWithColors.length];
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className="p-2.5 rounded-xl bg-card border border-border/40 shadow-2xs space-y-1 hover:border-primary/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                    <div className="relative h-4 w-4 rounded overflow-hidden bg-muted border border-border/40 shrink-0">
                      {targetRoom.imageUrl ? (
                        <Image src={targetRoom.imageUrl} alt={targetRoom.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className={`h-full w-full ${targetRoom.colorObj.dot}`} />
                      )}
                    </div>
                    <span>{idx === 0 ? "Tomorrow • 9:30 AM" : `${evt.date} • ${evt.startTime}`}</span>
                  </div>
                  <h5 className="text-xs font-bold text-foreground truncate">{evt.title}</h5>
                  <p className="text-[10px] text-muted-foreground font-medium">{targetRoom.name}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action Button */}
        <Button
          variant="outline"
          onClick={() => onOpenMyBookingsDrawer?.()}
          className="w-full h-9 text-xs font-semibold gap-2 border-border/60 bg-card hover:bg-accent cursor-pointer shrink-0 mt-auto"
        >
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>View My Bookings</span>
        </Button>
      </aside>
    </div>
  );
}
