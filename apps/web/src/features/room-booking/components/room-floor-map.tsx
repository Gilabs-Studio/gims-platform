"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Minus, RotateCcw, Grid, Layers, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoomCanvasObjectItem } from "./room-canvas-object";
import type { Room, RoomCanvasObject, RoomLayoutCanvasData } from "../types/room-booking.types";

interface RoomFloorMapProps {
  rooms: Room[];
  layoutData?: RoomLayoutCanvasData;
  zoomLevel: number;
  showGrid?: boolean;
  onSelectRoom: (room: Room) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid?: () => void;
  className?: string;
}

export function RoomFloorMap({
  rooms,
  layoutData,
  zoomLevel,
  showGrid = true,
  onSelectRoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid = () => {},
  className = "",
}: RoomFloorMapProps) {
  const t = useTranslations("roomBooking");
  const svgRef = useRef<SVGSVGElement>(null);

  // Active Floor Tab state
  const [activeFloor, setActiveFloor] = useState<string>("floor-3");

  // Viewport panning state
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const canvasWidth = layoutData?.width || 1250;
  const canvasHeight = layoutData?.height || 560;
  const gridSize = layoutData?.gridSize || 20;

  // Real-time statistics summary
  const availableCount = rooms.filter((r) => r.status === "available").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
  const reservedCount = rooms.filter((r) => r.status === "reserved").length;
  const totalSeats = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const occupancyPercentage = Math.round((occupiedCount / Math.max(1, rooms.length)) * 100);

  // Mouse pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      const target = e.target as Element;
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
    <div className={`w-full h-full flex flex-col bg-card/60 backdrop-blur-md rounded-2xl border border-border/60 shadow-2xs overflow-hidden relative ${className}`}>
      {/* Informative Top Control Toolbar */}
      <div className="p-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-card/90 z-20 shrink-0">
        {/* Left: Floor Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5 text-xs">
            <button
              onClick={() => setActiveFloor("floor-3")}
              className={`cursor-pointer px-3 py-1 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all ${
                activeFloor === "floor-3"
                  ? "bg-card text-foreground shadow-2xs font-bold border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Lantai 3 - HQ</span>
            </button>

            <button
              onClick={() => setActiveFloor("floor-2")}
              className={`cursor-pointer px-3 py-1 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all ${
                activeFloor === "floor-2"
                  ? "bg-card text-foreground shadow-2xs font-bold border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Lantai 2 - Tech Hub</span>
            </button>

            <button
              onClick={() => setActiveFloor("floor-1")}
              className={`cursor-pointer px-3 py-1 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all ${
                activeFloor === "floor-1"
                  ? "bg-card text-foreground shadow-2xs font-bold border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Lantai 1 - Executive</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Occupancy Metrics & Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Metrics Badges using modular <Badge /> */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Badge variant="success" className="gap-1.5 px-2.5 py-1 text-xs font-semibold shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{availableCount} Available</span>
            </Badge>

            <Badge variant="warning" className="gap-1.5 px-2.5 py-1 text-xs font-semibold shadow-2xs">
              <Clock className="h-3.5 w-3.5" />
              <span>{occupiedCount} Occupied</span>
            </Badge>

            <Badge variant="destructive" className="gap-1.5 px-2.5 py-1 text-xs font-semibold shadow-2xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{reservedCount} Reserved</span>
            </Badge>

            <Badge variant="active" className="gap-1.5 px-2.5 py-1 text-xs font-bold shadow-2xs">
              <Users className="h-3.5 w-3.5" />
              <span>{totalSeats} Seats ({occupancyPercentage}% Occupied)</span>
            </Badge>
          </div>

          {/* Zoom & Canvas Controls */}
          <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-lg border border-border/60">
            <Button
              variant={showGrid ? "secondary" : "ghost"}
              size="sm"
              onClick={onToggleGrid}
              className="cursor-pointer h-7 text-xs px-2 gap-1"
              title="Toggle Grid Canvas"
            >
              <Grid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              className="h-7 w-7 cursor-pointer"
              title="Zoom In"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              className="h-7 w-7 cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPanOffset({ x: 0, y: 0 });
                onResetZoom();
              }}
              className="h-7 w-7 cursor-pointer"
              title="Reset Pan & Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Architectural Canvas Area */}
      <div className="relative flex-1 bg-muted/5 overflow-hidden flex items-center justify-center p-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full h-full select-none canvas-bg ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
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
                strokeOpacity={showGrid ? 0.35 : 0}
              />
              <circle
                cx={gridSize}
                cy={gridSize}
                r={0.75}
                fill="var(--color-muted-foreground, #94a3b8)"
                fillOpacity={showGrid ? 0.25 : 0}
              />
            </pattern>
          </defs>

          <g
            transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
            className="transition-transform duration-75 ease-out origin-center"
          >
            {/* Architectural Canvas Base */}
            <rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              rx={16}
              fill="var(--color-card, #ffffff)"
              stroke="var(--color-border, #cbd5e1)"
              strokeWidth={1.5}
              className="canvas-bg shadow-2xs"
            />

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

            {/* Render Canvas Room & Furniture Objects */}
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

        {/* Floating Legend Pill using modular <Badge /> */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-card/95 border border-border/60 rounded-xl shadow-xs backdrop-blur-md text-xs">
          <span className="font-bold text-foreground tracking-wide uppercase text-[10px] text-muted-foreground mr-1">
            {t("legend.title")}:
          </span>
          <Badge variant="success" className="gap-1.5 text-[11px] font-semibold py-0.5 px-2">
            <span className="h-2 w-2 rounded-full bg-white shadow-2xs" />
            <span>Available ({availableCount})</span>
          </Badge>
          <Badge variant="warning" className="gap-1.5 text-[11px] font-semibold py-0.5 px-2">
            <span className="h-2 w-2 rounded-full bg-white shadow-2xs animate-pulse" />
            <span>Occupied ({occupiedCount})</span>
          </Badge>
          <Badge variant="destructive" className="gap-1.5 text-[11px] font-semibold py-0.5 px-2">
            <span className="h-2 w-2 rounded-full bg-white shadow-2xs" />
            <span>Reserved ({reservedCount})</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}
