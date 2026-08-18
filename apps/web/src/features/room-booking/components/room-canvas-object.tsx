"use client";

import { memo } from "react";
import type { RoomCanvasObject, RoomStatus } from "../types/room-booking.types";

interface RoomCanvasObjectProps {
  readonly object: RoomCanvasObject;
  readonly isSelected: boolean;
  readonly onSelectRoom?: (roomId: string) => void;
  readonly onClick?: (e: React.MouseEvent, id: string) => void;
}

const STATUS_COLOR_SCHEMES: Record<RoomStatus, { fill: string; stroke: string; text: string; badgeFill: string }> = {
  available: {
    fill: "var(--color-success-subtle, rgba(34, 197, 94, 0.12))",
    stroke: "#22c55e",
    text: "#15803d",
    badgeFill: "#22c55e",
  },
  occupied: {
    fill: "var(--color-warning-subtle, rgba(245, 158, 11, 0.14))",
    stroke: "#f59e0b",
    text: "#b45309",
    badgeFill: "#f59e0b",
  },
  reserved: {
    fill: "var(--color-rose-subtle, rgba(244, 63, 94, 0.14))",
    stroke: "#f43f5e",
    text: "#be123c",
    badgeFill: "#f43f5e",
  },
  unavailable: {
    fill: "rgba(100, 116, 139, 0.12)",
    stroke: "#64748b",
    text: "#475569",
    badgeFill: "#64748b",
  },
};

function RoomZoneObject({
  object,
  isSelected,
  onSelectRoom,
}: {
  readonly object: RoomCanvasObject;
  readonly isSelected: boolean;
  readonly onSelectRoom?: (roomId: string) => void;
}) {
  const status = object.roomStatus || "available";
  const colors = STATUS_COLOR_SCHEMES[status];
  const w = object.width;
  const h = object.height;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        if (object.roomId) {
          onSelectRoom?.(object.roomId);
        }
      }}
      className="cursor-pointer group transition-all duration-200"
    >
      {/* Main Room Background Fill */}
      <rect
        x={1}
        y={1}
        width={w - 2}
        height={h - 2}
        rx={10}
        fill={colors.fill}
        stroke={isSelected ? "var(--color-primary, #3b82f6)" : colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-all duration-200 group-hover:brightness-95 group-hover:stroke-primary"
      />

      {/* Room Code Pill Badge (Top Left) */}
      {object.roomCode && (
        <g transform="translate(12, 12)">
          <rect x={0} y={0} width={44} height={22} rx={6} fill={colors.badgeFill} fillOpacity={0.9} />
          <text
            x={22}
            y={11}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight="700"
            fill="#ffffff"
            className="select-none pointer-events-none"
          >
            {object.roomCode}
          </text>
        </g>
      )}

      {/* Room Title Label (Center) */}
      <text
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight="700"
        fill="var(--color-foreground, #0f172a)"
        className="select-none pointer-events-none group-hover:fill-primary"
      >
        {object.label || `Room ${object.roomCode}`}
      </text>

      {/* Status Dot & Label (Bottom Center) */}
      <g transform={`translate(${w / 2 - 32}, ${h - 22})`}>
        <circle cx={6} cy={6} r={4} fill={colors.badgeFill} />
        <text
          x={14}
          y={6}
          dominantBaseline="central"
          fontSize={10}
          fontWeight="600"
          fill={colors.text}
          className="select-none pointer-events-none capitalize"
        >
          {status}
        </text>
      </g>
    </g>
  );
}

function TableObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  const isCircle = object.tableShape === "circle";
  const strokeColor = isSelected ? "var(--color-primary, #3b82f6)" : "var(--color-border, #cbd5e1)";
  const fillColor = "var(--color-card, #ffffff)";

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
        {object.label && (
          <text
            x={object.width / 2}
            y={object.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight="600"
            fill="var(--color-muted-foreground, #64748b)"
            className="select-none pointer-events-none"
          >
            {object.label}
          </text>
        )}
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
      {object.label && (
        <text
          x={object.width / 2}
          y={object.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="600"
          fill="var(--color-muted-foreground, #64748b)"
          className="select-none pointer-events-none"
        >
          {object.label}
        </text>
      )}
    </g>
  );
}

function ChairObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  const w = object.width;
  const h = object.height;
  const strokeColor = isSelected ? "var(--color-primary, #3b82f6)" : "var(--color-border, #cbd5e1)";
  return (
    <g>
      <rect
        x={2}
        y={2}
        width={w - 4}
        height={h - 4}
        rx={4}
        fill="var(--color-card, #ffffff)"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.2}
      />
    </g>
  );
}

function WallObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  return (
    <rect
      x={0}
      y={0}
      width={object.width}
      height={object.height}
      fill="var(--color-foreground, #1e293b)"
      fillOpacity={0.85}
      stroke={isSelected ? "var(--color-primary, #3b82f6)" : "none"}
      strokeWidth={isSelected ? 2 : 0}
      rx={1}
    />
  );
}

function DoorObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  const w = object.width;
  const h = object.height;
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill="var(--color-muted, #f1f5f9)"
        stroke={isSelected ? "var(--color-primary, #3b82f6)" : "#94a3b8"}
        strokeWidth={1.5}
        rx={2}
      />
      <path
        d={`M ${w * 0.1} ${h * 0.5} A ${w * 0.35} ${w * 0.35} 0 0 1 ${w * 0.9} ${h * 0.5}`}
        fill="none"
        stroke="#64748b"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </g>
  );
}

function ReceptionObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={6}
        fill="var(--color-primary-subtle, rgba(59, 130, 246, 0.1))"
        stroke={isSelected ? "var(--color-primary, #3b82f6)" : "var(--color-primary, #3b82f6)"}
        strokeWidth={1.5}
      />
      <text
        x={object.width / 2}
        y={object.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight="600"
        fill="var(--color-primary, #3b82f6)"
        className="select-none pointer-events-none"
      >
        {object.label || "Reception"}
      </text>
    </g>
  );
}

function ScreenObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={object.width}
        height={object.height}
        rx={2}
        fill="var(--color-primary, #3b82f6)"
        stroke={isSelected ? "#1d4ed8" : "none"}
        strokeWidth={isSelected ? 2 : 0}
      />
    </g>
  );
}

function ZoneObject({ object, isSelected }: { readonly object: RoomCanvasObject; readonly isSelected: boolean }) {
  const color = object.color || "#3b82f6";
  const opacity = object.opacity || 0.1;
  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={8}
        fill={color}
        fillOpacity={opacity}
        stroke={isSelected ? "var(--color-primary, #3b82f6)" : color}
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />
      {object.label && (
        <text
          x={object.width / 2}
          y={16}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight="600"
          fill={color}
          className="select-none pointer-events-none"
        >
          {object.label}
        </text>
      )}
    </g>
  );
}

function DecorationObject({ object }: { readonly object: RoomCanvasObject }) {
  return (
    <g>
      <rect
        x={1}
        y={1}
        width={object.width - 2}
        height={object.height - 2}
        rx={6}
        fill="var(--color-muted, #f1f5f9)"
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <text
        x={object.width / 2}
        y={object.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight="500"
        fill="#64748b"
        className="select-none pointer-events-none"
      >
        {object.label || "Decor"}
      </text>
    </g>
  );
}

const RENDERERS: Record<
  string,
  React.FC<{ object: RoomCanvasObject; isSelected: boolean; onSelectRoom?: (roomId: string) => void }>
> = {
  room: RoomZoneObject,
  table: TableObject,
  chair: ChairObject,
  wall: WallObject,
  door: DoorObject,
  reception: ReceptionObject,
  screen: ScreenObject,
  zone: ZoneObject,
  decoration: DecorationObject,
};

function RoomCanvasObjectInner({ object, isSelected, onSelectRoom, onClick }: RoomCanvasObjectProps) {
  const Renderer = RENDERERS[object.type];
  if (!Renderer) return null;

  return (
    <g
      transform={`translate(${object.x}, ${object.y})${object.rotation ? ` rotate(${object.rotation}, ${object.width / 2}, ${object.height / 2})` : ""}`}
      onClick={(e) => onClick?.(e, object.id)}
    >
      <Renderer object={object} isSelected={isSelected} onSelectRoom={onSelectRoom} />
    </g>
  );
}

export const RoomCanvasObjectItem = memo(RoomCanvasObjectInner);
