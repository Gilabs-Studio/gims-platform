"use client";

import { useTranslations } from "next-intl";
import { Plus, Minus, RotateCcw, Map, LayoutGrid, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoomCanvasToolbarProps {
  activeTab: "map" | "list";
  selectedLocation: string;
  selectedFloor: string;
  showGrid: boolean;
  onTabChange: (tab: "map" | "list") => void;
  onLocationChange: (location: string) => void;
  onFloorChange: (floor: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid: () => void;
}

export function RoomCanvasToolbar({
  activeTab,
  selectedLocation,
  selectedFloor,
  showGrid,
  onTabChange,
  onLocationChange,
  onFloorChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid,
}: RoomCanvasToolbarProps) {
  const t = useTranslations("roomBooking");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between px-6 py-3.5 bg-card border-b border-border/60 rounded-t-xl">
      {/* Left: View Mode Tabs */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => onTabChange("map")}
          className={`cursor-pointer flex items-center gap-2 pb-1 text-xs font-bold border-b-2 transition-all duration-200 ${
            activeTab === "map"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Map className="h-4 w-4" />
          <span>{t("tabs.floorMap")}</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("list")}
          className={`cursor-pointer flex items-center gap-2 pb-1 text-xs font-bold border-b-2 transition-all duration-200 ${
            activeTab === "list"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>{t("tabs.roomList")}</span>
        </button>
      </div>

      {/* Right: Filters & Viewport Controls */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Location Dropdown */}
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="h-8 min-w-[150px] text-xs cursor-pointer bg-background">
            <SelectValue placeholder={t("filterOptions.allLocations")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kantor Pusat - Jakarta" className="cursor-pointer text-xs">
              {t("filterOptions.headOfficeJakarta")}
            </SelectItem>
            <SelectItem value="Cabang - Surabaya" className="cursor-pointer text-xs">
              {t("filterOptions.branchSurabaya")}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Floor Dropdown */}
        <Select value={selectedFloor} onValueChange={onFloorChange}>
          <SelectTrigger className="h-8 min-w-[105px] text-xs cursor-pointer bg-background">
            <SelectValue placeholder={t("filterOptions.floor3")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Lantai 3" className="cursor-pointer text-xs">
              {t("filterOptions.floor3")}
            </SelectItem>
            <SelectItem value="Lantai 2" className="cursor-pointer text-xs">
              {t("filterOptions.floor2")}
            </SelectItem>
            <SelectItem value="Lantai 1" className="cursor-pointer text-xs">
              {t("filterOptions.floor1")}
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

        {/* Grid Toggle */}
        <Button
          variant={showGrid ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleGrid}
          className="cursor-pointer h-8 text-xs gap-1.5"
          title="Toggle Grid Canvas"
        >
          <Grid className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Grid</span>
        </Button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onZoomIn}
            className="h-8 w-8 cursor-pointer"
            title="Zoom In"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onZoomOut}
            className="h-8 w-8 cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onResetZoom}
            className="h-8 w-8 cursor-pointer"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
