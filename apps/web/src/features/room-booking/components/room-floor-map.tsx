"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { RoomCanvasObjectItem } from "./room-canvas-object";
import { RoomCanvasToolbar } from "./room-canvas-toolbar";
import type { Room, RoomCanvasObject, RoomLayoutCanvasData } from "../types/room-booking.types";

interface RoomFloorMapProps {
  rooms: Room[];
  layoutData?: RoomLayoutCanvasData;
  activeTab: "map" | "list";
  selectedLocation: string;
  selectedFloor: string;
  zoomLevel: number;
  showGrid?: boolean;
  onTabChange: (tab: "map" | "list") => void;
  onLocationChange: (loc: string) => void;
  onFloorChange: (floor: string) => void;
  onSelectRoom: (room: Room) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid?: () => void;
}

export function RoomFloorMap({
  rooms,
  layoutData,
  activeTab,
  selectedLocation,
  selectedFloor,
  zoomLevel,
  showGrid = true,
  onTabChange,
  onLocationChange,
  onFloorChange,
  onSelectRoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid = () => {},
}: RoomFloorMapProps) {
  const t = useTranslations("roomBooking");
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport panning state
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const canvasWidth = layoutData?.width || 1250;
  const canvasHeight = layoutData?.height || 520;
  const gridSize = layoutData?.gridSize || 20;

  // Mouse pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      const target = e.target as Element;
      // Allow pan when dragging background canvas
      if (target.tagName === "svg" || target.classList.contains("canvas-bg")) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleSelectRoomById = useCallback(
    (roomId: string) => {
      const targetRoom = rooms.find((r) => r.id === roomId);
      if (targetRoom) {
        onSelectRoom(targetRoom);
      }
    },
    [rooms, onSelectRoom],
  );

  return (
    <Card className="h-full border border-border/60 bg-card shadow-sm transition-all duration-200 overflow-hidden flex flex-col">
      {/* 1. Header Toolbar Controls */}
      <RoomCanvasToolbar
        activeTab={activeTab}
        selectedLocation={selectedLocation}
        selectedFloor={selectedFloor}
        showGrid={showGrid}
        onTabChange={onTabChange}
        onLocationChange={onLocationChange}
        onFloorChange={onFloorChange}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={() => {
          setPanOffset({ x: 0, y: 0 });
          onResetZoom();
        }}
        onToggleGrid={onToggleGrid}
      />

      {/* 2. Interactive SVG Full Grid Canvas Area */}
      {activeTab === "map" && (
        <div className="relative flex-1 min-h-[460px] bg-muted/10 border-b border-border/40 overflow-hidden flex items-center justify-center p-4">
          <div className="relative w-full h-full min-h-[440px] flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`w-full h-[480px] select-none canvas-bg ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Dynamic SVG Grid Pattern */}
                <pattern
                  id="room-canvas-grid"
                  width={gridSize}
                  height={gridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke="var(--color-border, #e2e8f0)"
                    strokeWidth="0.5"
                    strokeOpacity={showGrid ? 0.45 : 0}
                  />
                  <circle
                    cx={gridSize}
                    cy={gridSize}
                    r={0.75}
                    fill="var(--color-muted-foreground, #94a3b8)"
                    fillOpacity={showGrid ? 0.3 : 0}
                  />
                </pattern>
              </defs>

              {/* Viewport Transform Group (Zoom & Pan) */}
              <g
                transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
                className="transition-transform duration-75 ease-out origin-center"
              >
                {/* Canvas Outer Border & Background */}
                <rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  rx={12}
                  fill="var(--color-card, #ffffff)"
                  stroke="var(--color-border, #cbd5e1)"
                  strokeWidth={2}
                  className="canvas-bg"
                />

                {/* Grid Overlay */}
                {showGrid && (
                  <rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    fill="url(#room-canvas-grid)"
                    className="pointer-events-none"
                  />
                )}

                {/* Render Canvas Objects */}
                {layoutData?.objects.map((obj: RoomCanvasObject) => (
                  <RoomCanvasObjectItem
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectId === obj.id}
                    onSelectRoom={handleSelectRoomById}
                    onClick={(_, id) => setSelectedObjectId(id)}
                  />
                ))}
              </g>
            </svg>
          </div>

          {/* 3. Bottom Canvas Floating Legend */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 px-4 py-2 bg-card/90 border border-border/60 rounded-lg shadow-sm backdrop-blur-md text-xs">
            <span className="font-bold text-foreground tracking-wide uppercase text-[10px]">
              {t("legend.title")}:
            </span>
            <div className="flex items-center gap-2 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              <span>{t("legend.available")}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              <span>{t("legend.occupied")}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-rose" />
              <span>{t("legend.reserved")}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60" />
              <span>{t("legend.unavailable")}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
