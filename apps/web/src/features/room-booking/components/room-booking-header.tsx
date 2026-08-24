"use client";

import { useTranslations } from "next-intl";
import { Map, Calendar, Plus, CalendarDays, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ViewTabMode = "map" | "calendar";

interface RoomBookingHeaderProps {
  activeTab: ViewTabMode;
  onTabChange: (tab: ViewTabMode) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  selectedFloor: string;
  onFloorChange: (floor: string) => void;
  onOpenCreateModal: () => void;
  onOpenMyBookingsDrawer: () => void;
  canCreateBooking?: boolean;
  hasFloors?: boolean;
}

export function RoomBookingHeader({
  activeTab,
  onTabChange,
  selectedLocation,
  onLocationChange,
  selectedFloor,
  onFloorChange,
  onOpenCreateModal,
  onOpenMyBookingsDrawer,
  canCreateBooking = true,
  hasFloors = true,
}: RoomBookingHeaderProps) {
  const t = useTranslations("roomBooking");

  // Office location without floors (e.g. Cabang Surabaya single building)
  const isSingleFloorOffice = !hasFloors || selectedLocation.includes("Surabaya");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border/40 pb-4">
      {/* Left: Simplified Clean Page Title */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-xs text-muted-foreground font-medium">
          {t("subtitle")}
        </p>
      </div>

      {/* Right: Selectors & Prominent View Mode Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Separate Location (Kantor) Selector */}
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="cursor-pointer h-9 text-xs w-[170px] bg-card">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
            <SelectValue placeholder={t("actions.selectLocation")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kantor Pusat - Jakarta" className="text-xs cursor-pointer">
              {t("filterOptions.headOfficeJakarta")}
            </SelectItem>
            <SelectItem value="Cabang - Surabaya" className="text-xs cursor-pointer">
              {t("filterOptions.branchSurabaya")}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Separate Floor (Lantai) Selector - Hidden if single-floor office */}
        {!isSingleFloorOffice && (
          <Select value={selectedFloor} onValueChange={onFloorChange}>
            <SelectTrigger className="cursor-pointer h-9 text-xs w-[110px] bg-card">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <SelectValue placeholder={t("actions.selectFloor")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lantai 3" className="text-xs cursor-pointer">{t("filterOptions.floor3")}</SelectItem>
              <SelectItem value="Lantai 2" className="text-xs cursor-pointer">{t("filterOptions.floor2")}</SelectItem>
              <SelectItem value="Lantai 1" className="text-xs cursor-pointer">{t("filterOptions.floor1")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Prominent View Mode Switcher (Jadwal Kalender & Peta Visual) */}
        <div className="flex items-center rounded-lg bg-card border border-border/60 p-1 text-xs shadow-2xs">
          <button
            onClick={() => onTabChange("calendar")}
            className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "calendar"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>{t("tabs.calendarSchedule")}</span>
          </button>

          <button
            onClick={() => onTabChange("map")}
            className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "map"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="h-4 w-4" />
            <span>{t("tabs.floorMap")}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMyBookingsDrawer}
          className="cursor-pointer h-9 text-xs font-semibold gap-1.5 bg-card"
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>{t("actions.myBookings")}</span>
        </Button>

        {canCreateBooking && (
          <Button
            size="sm"
            onClick={onOpenCreateModal}
            className="cursor-pointer h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs px-4"
          >
            <Plus className="h-4 w-4" />
            <span>{t("actions.createBooking")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
