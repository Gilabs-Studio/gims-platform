"use client";

import { memo } from "react";

import type { LayoutObject } from "../types";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

// Visual configuration per object type
const ZONE_COLORS: Record<string, string> = {
  dining: "#3b82f6",
  vip: "#a855f7",
  outdoor: "#22c55e",
  bar: "#f97316",
  kitchen: "#ef4444",
  storage: "#6b7280",
  entrance: "#14b8a6",
  restroom: "#06b6d4",
  waiting: "#eab308",
};

interface CanvasObjectProps {
  readonly object: LayoutObject;
  readonly isSelected: boolean;
  readonly onMouseDown: (e: React.MouseEvent, id: string) => void;
  readonly onClick: (e: React.MouseEvent, id: string) => void;
  readonly onResizeStart?: (e: React.MouseEvent, id: string, handle: ResizeHandle) => void;
  readonly onRotateStart?: (e: React.MouseEvent, id: string) => void;
}

function TableObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  const isCircle = object.tableShape === "circle";
  const strokeColor = isSelected ? "#3b82f6" : "#64748b";
  const fillColor = "#fef3c7";

  if (isCircle) {
    const r = Math.min(object.width, object.height) / 2;
    return (
      <g>
        <circle
          cx={object.width / 2}
          cy={object.height / 2}
          r={r - 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 2.5 : 1.5}
        />
        <text
          x={object.width / 2}
          y={object.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontWeight="bold"
          fill="#92400e"
          className="select-none pointer-events-none"
        >
          {object.label ?? `T${object.tableNumber}`}
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={6}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
      <text
        x={object.width / 2}
        y={object.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
        fill="#92400e"
        className="select-none pointer-events-none"
      >
        {object.label ?? `T${object.tableNumber}`}
      </text>
    </g>
  );
}

function ChairObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  const w = object.width;
  const h = object.height;
  const strokeColor = isSelected ? "#3b82f6" : "#60a5fa";
  const backrestH = Math.max(6, Math.round(h * 0.3));
  const seatH = Math.max(6, h - backrestH - 4);
  return (
    <g>
      {/* Backrest */}
      <rect
        x={2}
        y={2}
        width={w - 4}
        height={backrestH}
        rx={2}
        fill="#bfdbfe"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {/* Seat */}
      <rect
        x={2}
        y={backrestH + 4}
        width={w - 4}
        height={seatH}
        rx={3}
        fill="#dbeafe"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.5}
      />
    </g>
  );
}

function WallObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  return (
    <rect
      x={0}
      y={0}
      width={object.width}
      height={object.height}
      fill="#475569"
      stroke={isSelected ? "#3b82f6" : "#334155"}
      strokeWidth={isSelected ? 2 : 1}
      rx={1}
    />
  );
}

function DoorObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  const w = object.width;
  const h = object.height;
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill="#fde68a" stroke={isSelected ? "#3b82f6" : "#d97706"} strokeWidth={isSelected ? 2 : 1} rx={2} />
      {/* Door swing arc */}
      <path
        d={`M ${w * 0.1} ${h * 0.5} A ${w * 0.35} ${w * 0.35} 0 0 1 ${w * 0.9} ${h * 0.5}`}
        fill="none"
        stroke="#d97706"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </g>
  );
}

function CashierObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={4}
        fill="#dcfce7"
        stroke={isSelected ? "#3b82f6" : "#16a34a"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
      {/* Monitor icon */}
      <rect
        x={object.width * 0.25}
        y={object.height * 0.15}
        width={object.width * 0.5}
        height={object.height * 0.4}
        rx={2}
        fill="#bbf7d0"
        stroke="#16a34a"
        strokeWidth={1}
      />
      <text
        x={object.width / 2}
        y={object.height * 0.72}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight="600"
        fill="#166534"
        className="select-none pointer-events-none"
      >
        {object.label ?? "Cashier"}
      </text>
    </g>
  );
}

function ZoneObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  const color = object.color ?? ZONE_COLORS[object.zoneType ?? "dining"] ?? "#3b82f6";
  const fillOpacity = object.opacity ?? 0.15;

  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={8}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={isSelected ? "#3b82f6" : color}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={isSelected ? "none" : "6 3"}
      />
      <text
        x={object.width / 2}
        y={16}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="600"
        fill={color}
        fillOpacity={0.8}
        className="select-none pointer-events-none"
      >
        {object.label ?? object.zoneType ?? "Zone"}
      </text>
    </g>
  );
}

function DecorationObject({ object, isSelected }: { readonly object: LayoutObject; readonly isSelected: boolean }) {
  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={4}
        fill="#fce7f3"
        stroke={isSelected ? "#3b82f6" : "#ec4899"}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray="4 2"
      />
      {/* Star decoration */}
      <text
        x={object.width / 2}
        y={object.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={16}
        className="select-none pointer-events-none"
      >
        &#10022;
      </text>
    </g>
  );
}

// Selection handles: 8 resize handles + 1 rotation handle
interface SelectionHandlesProps {
  readonly object: LayoutObject;
  readonly onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
  readonly onRotateStart: (e: React.MouseEvent) => void;
}

function SelectionHandles({ object, onResizeStart, onRotateStart }: SelectionHandlesProps) {
  const hs = 8;
  const w = object.width;
  const h = object.height;

  const handles: { id: ResizeHandle; x: number; y: number; cursor: string }[] =
    object.type === "wall"
      ? [
          { id: "w", x: -hs / 2, y: h / 2 - hs / 2, cursor: "ew-resize" },
          { id: "e", x: w - hs / 2, y: h / 2 - hs / 2, cursor: "ew-resize" },
        ]
      : object.type === "door"
        ? []
      : [
          { id: "nw", x: -hs / 2,         y: -hs / 2,         cursor: "nw-resize" },
          { id: "n",  x: w / 2 - hs / 2,  y: -hs / 2,         cursor: "n-resize"  },
          { id: "ne", x: w - hs / 2,       y: -hs / 2,         cursor: "ne-resize" },
          { id: "e",  x: w - hs / 2,       y: h / 2 - hs / 2,  cursor: "e-resize"  },
          { id: "se", x: w - hs / 2,       y: h - hs / 2,      cursor: "se-resize" },
          { id: "s",  x: w / 2 - hs / 2,  y: h - hs / 2,      cursor: "s-resize"  },
          { id: "sw", x: -hs / 2,          y: h - hs / 2,      cursor: "sw-resize" },
          { id: "w",  x: -hs / 2,          y: h / 2 - hs / 2,  cursor: "w-resize"  },
        ];

  return (
    <g>
      {/* Dashed selection border */}
      <rect
        x={-2}
        y={-2}
        width={w + 4}
        height={h + 4}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      {/* Rotation stem */}
      <line x1={w / 2} y1={-2} x2={w / 2} y2={-18} stroke="#3b82f6" strokeWidth={1} />
      {/* Rotation handle */}
      <circle
        cx={w / 2}
        cy={-25}
        r={6}
        fill="white"
        stroke="#3b82f6"
        strokeWidth={1.5}
        style={{ cursor: "grab" }}
        onMouseDown={(e) => { e.stopPropagation(); onRotateStart(e); }}
      />
      {/* 8 resize handles */}
      {handles.map((handle) => (
        <rect
          key={handle.id}
          x={handle.x}
          y={handle.y}
          width={hs}
          height={hs}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1.5}
          rx={1}
          style={{ cursor: handle.cursor }}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, handle.id); }}
        />
      ))}
    </g>
  );
}

const RENDERERS: Record<string, React.FC<{ object: LayoutObject; isSelected: boolean }>> = {
  table: TableObject,
  chair: ChairObject,
  wall: WallObject,
  door: DoorObject,
  cashier: CashierObject,
  zone: ZoneObject,
  decoration: DecorationObject,
};

function CanvasObjectInner({ object, isSelected, onMouseDown, onClick, onResizeStart, onRotateStart }: CanvasObjectProps) {
  const Renderer = RENDERERS[object.type];
  if (!Renderer) return null;

  return (
    <g
      transform={`translate(${object.x}, ${object.y})${object.rotation ? ` rotate(${object.rotation}, ${object.width / 2}, ${object.height / 2})` : ""}`}
      onMouseDown={(e) => onMouseDown(e, object.id)}
      onClick={(e) => onClick(e, object.id)}
      className={object.locked ? "cursor-not-allowed" : "cursor-move"}
      style={{ opacity: object.locked ? 0.6 : 1 }}
    >
      <Renderer object={object} isSelected={isSelected} />
      {isSelected && !object.locked && (
        <SelectionHandles
          object={object}
          onResizeStart={(e, handle) => onResizeStart?.(e, object.id, handle)}
          onRotateStart={(e) => onRotateStart?.(e, object.id)}
        />
      )}
    </g>
  );
}

export const CanvasObject = memo(CanvasObjectInner);
