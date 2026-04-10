"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { LayoutObject, LayoutObjectType, TableChairLayout } from "../types";
import type { ResizeHandle } from "./canvas-object";
import { CanvasObject } from "./canvas-object";
import type { useCanvasEditor } from "../hooks/use-canvas-editor";

type CanvasEditorReturn = ReturnType<typeof useCanvasEditor>;

interface FloorCanvasProps {
  readonly editor: CanvasEditorReturn;
}

const WALL_THICKNESS = 12;
const INFINITE_SIZE = 50000;
const MIN_OBJECT_SIZE = 20;
const WALL_ENDPOINT_SNAP_DISTANCE = 18;
const WALL_JUNCTION_MERGE_DISTANCE = 8;
const DOOR_ATTACH_MAX_DISTANCE = 18;

interface ResizeState {
  id: string;
  handle: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  initX: number;
  initY: number;
  initWidth: number;
  initHeight: number;
  wallFixedPoint?: Point;
  wallMovingEndpoint?: "start" | "end";
  wallSnapEndpoints?: WallEndpoint[];
}

interface DragStartState {
  x: number;
  y: number;
  items: Array<{ id: string; objX: number; objY: number }>;
}

interface RotationState {
  id: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  initRotation: number;
}

interface BoxSelectRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ZoneDraftRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface Point {
  x: number;
  y: number;
}

interface WallEndpoint extends Point {
  wallId: string;
  endpoint: "start" | "end";
}

interface WallJunction extends Point {
  id: string;
  connections: WallEndpoint[];
}

interface CornerDragState {
  connections: Array<{ wallId: string; endpoint: "start" | "end" }>;
}

interface HitObject {
  id: string;
  zIndex: number;
}

function snapToOrthogonal(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: end.x, y: start.y }
    : { x: start.x, y: end.y };
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getWallEndpoints(objects: LayoutObject[]): WallEndpoint[] {
  return objects
    .filter((o) => o.type === "wall")
    .flatMap((wall) => {
      const centerX = wall.x + wall.width / 2;
      const centerY = wall.y + wall.height / 2;
      const halfLength = wall.width / 2;
      const angle = (wall.rotation * Math.PI) / 180;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      return [
        {
          wallId: wall.id,
          endpoint: "start" as const,
          x: centerX - ux * halfLength,
          y: centerY - uy * halfLength,
        },
        {
          wallId: wall.id,
          endpoint: "end" as const,
          x: centerX + ux * halfLength,
          y: centerY + uy * halfLength,
        },
      ];
    });
}

function wallSegmentFromObject(wall: LayoutObject): { start: Point; end: Point } {
  const centerX = wall.x + wall.width / 2;
  const centerY = wall.y + wall.height / 2;
  const halfLength = wall.width / 2;
  const angle = (wall.rotation * Math.PI) / 180;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  return {
    start: { x: centerX - ux * halfLength, y: centerY - uy * halfLength },
    end: { x: centerX + ux * halfLength, y: centerY + uy * halfLength },
  };
}

function distancePointToSegment(point: Point, start: Point, end: Point): number {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const len2 = vx * vx + vy * vy;
  if (len2 <= 0.0001) return distance(point, start);
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  const proj = { x: start.x + t * vx, y: start.y + t * vy };
  return distance(point, proj);
}

function isPointInsideObject(point: Point, obj: LayoutObject): boolean {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  const radians = (-obj.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const translatedX = point.x - centerX;
  const translatedY = point.y - centerY;
  const localX = translatedX * cos - translatedY * sin + obj.width / 2;
  const localY = translatedX * sin + translatedY * cos + obj.height / 2;

  return localX >= 0 && localX <= obj.width && localY >= 0 && localY <= obj.height;
}

function getTopDownHitObjects(objects: LayoutObject[], point: Point): HitObject[] {
  const renderOrder = [...objects].sort((a, b) => {
    if (a.type === "zone" && b.type !== "zone") return -1;
    if (a.type !== "zone" && b.type === "zone") return 1;
    return 0;
  });

  return renderOrder
    .map((obj, idx) => ({ obj, zIndex: idx }))
    .filter(({ obj }) => isPointInsideObject(point, obj))
    .sort((a, b) => b.zIndex - a.zIndex)
    .map(({ obj, zIndex }) => ({ id: obj.id, zIndex }));
}

function findNearestWallForPoint(objects: LayoutObject[], point: Point, maxDistance: number): LayoutObject | null {
  let best: LayoutObject | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const obj of objects) {
    if (obj.type !== "wall") continue;
    const seg = wallSegmentFromObject(obj);
    const d = distancePointToSegment(point, seg.start, seg.end);
    const threshold = Math.max(maxDistance, (obj.thickness ?? obj.height) / 2 + 6);
    if (d <= threshold && d < bestDistance) {
      best = obj;
      bestDistance = d;
    }
  }
  return best;
}

function nearestWallEndpoint(point: Point, endpoints: WallEndpoint[]): WallEndpoint | null {
  let best: WallEndpoint | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ep of endpoints) {
    const d = distance(point, ep);
    if (d < bestDist) {
      best = ep;
      bestDist = d;
    }
  }
  return bestDist <= WALL_ENDPOINT_SNAP_DISTANCE ? best : null;
}

function buildWallJunctions(endpoints: WallEndpoint[]): WallJunction[] {
  const junctions: WallJunction[] = [];
  for (const endpoint of endpoints) {
    let merged = false;
    for (const junction of junctions) {
      if (distance(endpoint, junction) <= WALL_JUNCTION_MERGE_DISTANCE) {
        const nextLen = junction.connections.length + 1;
        junction.x = (junction.x * junction.connections.length + endpoint.x) / nextLen;
        junction.y = (junction.y * junction.connections.length + endpoint.y) / nextLen;
        junction.connections.push(endpoint);
        merged = true;
        break;
      }
    }

    if (!merged) {
      junctions.push({
        id: `j_${junctions.length}`,
        x: endpoint.x,
        y: endpoint.y,
        connections: [endpoint],
      });
    }
  }
  return junctions;
}

function wallRectFromEndpoints(start: Point, end: Point, thickness: number): { x: number; y: number; width: number; height: number; rotation: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(MIN_OBJECT_SIZE, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2;
  return {
    x: cx - length / 2,
    y: cy - thickness / 2,
    width: length,
    height: thickness,
    rotation: angle,
  };
}

function tableSideFromPoint(table: LayoutObject, point: Point): Exclude<TableChairLayout, "auto"> {
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  const nx = (point.x - cx) / Math.max(1, table.width / 2);
  const ny = (point.y - cy) / Math.max(1, table.height / 2);
  if (Math.abs(nx) >= Math.abs(ny)) {
    return nx >= 0 ? "right" : "left";
  }
  return ny >= 0 ? "bottom" : "top";
}

function calcResize(
  state: ResizeState,
  dx: number,
  dy: number,
): { x: number; y: number; width: number; height: number } {
  const { handle, initX, initY, initWidth, initHeight } = state;
  let x = initX, y = initY, w = initWidth, h = initHeight;

  if (handle.includes("e")) w = Math.max(MIN_OBJECT_SIZE, initWidth + dx);
  if (handle.includes("s")) h = Math.max(MIN_OBJECT_SIZE, initHeight + dy);
  if (handle.includes("w")) {
    const nw = Math.max(MIN_OBJECT_SIZE, initWidth - dx);
    x = initX + (initWidth - nw);
    w = nw;
  }
  if (handle.includes("n")) {
    const nh = Math.max(MIN_OBJECT_SIZE, initHeight - dy);
    y = initY + (initHeight - nh);
    h = nh;
  }
  return { x, y, width: w, height: h };
}

export function FloorCanvas({ editor }: FloorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<DragStartState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [rotationState, setRotationState] = useState<RotationState | null>(null);
  const [cornerDragState, setCornerDragState] = useState<CornerDragState | null>(null);
  const [boxSelectRect, setBoxSelectRect] = useState<BoxSelectRect | null>(null);
  const [zoneDraftRect, setZoneDraftRect] = useState<ZoneDraftRect | null>(null);
  const suppressNextClick = useRef(false);

  // Alias for readability
  const activeWallState = editor.wallDrawing;
  const setActiveWallState = editor.setWallDrawing;
  const wallEndpoints = useMemo(
    () => (editor.activeTool === "wall" ? getWallEndpoints(editor.objects) : []),
    [editor.activeTool, editor.objects],
  );
  const wallJunctions = useMemo(
    () => buildWallJunctions(getWallEndpoints(editor.objects)).filter((j) => j.connections.length >= 2),
    [editor.objects],
  );

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - editor.panOffset.x) / editor.zoom,
        y: (clientY - rect.top - editor.panOffset.y) / editor.zoom,
      };
    },
    [editor.zoom, editor.panOffset],
  );

  const snapPoint = useCallback(
    (point: Point): Point => {
      if (!editor.snapToGrid || editor.gridSize <= 0) return point;
      return {
        x: Math.round(point.x / editor.gridSize) * editor.gridSize,
        y: Math.round(point.y / editor.gridSize) * editor.gridSize,
      };
    },
    [editor.gridSize, editor.snapToGrid],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, id: string, handle: ResizeHandle) => {
      e.stopPropagation();
      const obj = editor.objects.find((o) => o.id === id);
      if (!obj) return;
      const pos = screenToCanvas(e.clientX, e.clientY);
      editor.startDrag();
      const isWallSegmentResize = obj.type === "wall" && (handle === "w" || handle === "e");
      const segment = isWallSegmentResize ? wallSegmentFromObject(obj) : null;
      const wallFixedPoint = isWallSegmentResize
        ? (handle === "e" ? segment?.start : segment?.end)
        : undefined;
      const wallMovingEndpoint = isWallSegmentResize
        ? (handle === "e" ? "end" : "start")
        : undefined;
      const wallSnapEndpoints = isWallSegmentResize
        ? getWallEndpoints(editor.objects).filter((ep) => ep.wallId !== id)
        : undefined;

      setResizeState({
        id,
        handle,
        startMouseX: pos.x,
        startMouseY: pos.y,
        initX: obj.x,
        initY: obj.y,
        initWidth: obj.width,
        initHeight: obj.height,
        wallFixedPoint,
        wallMovingEndpoint,
        wallSnapEndpoints,
      });
    },
    [editor, screenToCanvas],
  );

  const handleRotateStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const obj = editor.objects.find((o) => o.id === id);
      if (!obj) return;
      const pos = screenToCanvas(e.clientX, e.clientY);
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;
      const startAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * (180 / Math.PI);
      editor.startDrag();
      setRotationState({ id, centerX, centerY, startAngle, initRotation: obj.rotation });
    },
    [editor, screenToCanvas],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        return;
      }
      if (draggingId) return;

      const tool = editor.activeTool;
      const pos = screenToCanvas(e.clientX, e.clientY);

      // --- Wall tool: click-click placement ---
      if (tool === "wall") {
        if (!activeWallState?.hasStart) {
          const snappedStart = nearestWallEndpoint(pos, wallEndpoints) ?? pos;
          setActiveWallState({
            hasStart: true,
            startX: snappedStart.x,
            startY: snappedStart.y,
            currentX: snappedStart.x,
            currentY: snappedStart.y,
          });
        } else {
          let endPoint = nearestWallEndpoint(pos, wallEndpoints) ?? pos;
          if (e.shiftKey) {
            endPoint = snapToOrthogonal({ x: activeWallState.startX, y: activeWallState.startY }, endPoint);
          }
          const dx = endPoint.x - activeWallState.startX;
          const dy = endPoint.y - activeWallState.startY;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length > 10) {
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const cx = activeWallState.startX + dx / 2;
            const cy = activeWallState.startY + dy / 2;
            editor.addWall(cx - length / 2, cy - WALL_THICKNESS / 2, length, WALL_THICKNESS, angle, true);

            // Keep wall tool active and continue from previous end point.
            setActiveWallState({
              hasStart: true,
              startX: endPoint.x,
              startY: endPoint.y,
              currentX: endPoint.x,
              currentY: endPoint.y,
            });
            return;
          }
          setActiveWallState({
            hasStart: true,
            startX: activeWallState.startX,
            startY: activeWallState.startY,
            currentX: activeWallState.startX,
            currentY: activeWallState.startY,
          });
        }
        return;
      }

      if (tool === "select") {
        const target = e.target as Element;
        if (target.tagName === "svg" || target.classList.contains("canvas-bg")) {
          editor.setSelectedObjectId(null);
          editor.setSelectedObjectIds([]);
        }
        return;
      }

      // Zone tool uses drag-to-create rectangle, not click placement.
      if (tool === "zone") {
        return;
      }

      editor.addObject(tool as LayoutObjectType, pos.x, pos.y);
    },
    [editor, screenToCanvas, draggingId, activeWallState, setActiveWallState, wallEndpoints],
  );

  const handleObjectMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (editor.activeTool !== "select") return;
      e.stopPropagation();
      // Door attach gesture: click selected door then click wall (no drag start on wall click)
      if (editor.selectedObject?.type === "door") {
        const maybeWall = editor.objects.find((o) => o.id === id);
        if (maybeWall?.type === "wall" && editor.selectedObject.id !== id) {
          return;
        }
      }
      const obj = editor.objects.find((o) => o.id === id);
      if (!obj || obj.locked) return;

      const currentSelection = editor.selectedObjectIds.length > 0
        ? editor.selectedObjectIds
        : (editor.selectedObjectId ? [editor.selectedObjectId] : []);
      const keepGroupSelection = currentSelection.length > 1 && currentSelection.includes(id);
      const dragIds = keepGroupSelection ? currentSelection : [id];

      if (!keepGroupSelection) {
        editor.setSelectedObjectId(id);
        editor.setSelectedObjectIds([id]);
      }

      editor.startDrag();
      const pos = screenToCanvas(e.clientX, e.clientY);
      const dragItems = editor.objects
        .filter((o) => dragIds.includes(o.id) && !o.locked)
        .map((o) => ({ id: o.id, objX: o.x, objY: o.y }));
      setDragStart({ x: pos.x, y: pos.y, items: dragItems });
      setDraggingId(id);
    },
    [editor, screenToCanvas],
  );

  const handleObjectClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      const pos = screenToCanvas(e.clientX, e.clientY);

      if (editor.activeTool !== "select" && editor.activeTool !== "door" && editor.activeTool !== "zone") {
        e.stopPropagation();
        editor.addObject(editor.activeTool as LayoutObjectType, pos.x, pos.y);
        return;
      }

      e.stopPropagation();

      // Door tool: direct click wall -> create door and instantly stick to that wall.
      if (editor.activeTool === "door") {
        const target = editor.objects.find((o) => o.id === id);
        if (target?.type === "wall") {
          const doorId = editor.addObject("door", pos.x, pos.y);
          editor.attachDoorToWall(doorId, target.id, { anchorPoint: pos, skipUndo: true });
        }
        return;
      }

      if (editor.activeTool === "select") {
        // Sticky behavior: click door then click wall to attach and align door.
        if (editor.selectedObject?.type === "door" && editor.selectedObject.id !== id) {
          const target = editor.objects.find((o) => o.id === id);
          if (target?.type === "wall") {
            editor.attachDoorToWall(editor.selectedObject.id, target.id, { anchorPoint: pos });
            return;
          }
        }

        if (e.shiftKey) {
          const ids = editor.selectedObjectIds.includes(id)
            ? editor.selectedObjectIds.filter((sid) => sid !== id)
            : [...editor.selectedObjectIds, id];
          editor.setSelectedObjectIds(ids);
          editor.setSelectedObjectId(ids[ids.length - 1] ?? null);
        } else {
          const hitObjects = getTopDownHitObjects(editor.objects, pos);
          if (hitObjects.length <= 1) {
            editor.setSelectedObjectId(id);
            editor.setSelectedObjectIds([id]);
            return;
          }

          const currentSelectedId = editor.selectedObjectId;
          const currentIndex = currentSelectedId
            ? hitObjects.findIndex((item) => item.id === currentSelectedId)
            : -1;
          const nextHit = currentIndex >= 0
            ? hitObjects[(currentIndex + 1) % hitObjects.length]
            : hitObjects[0];

          editor.setSelectedObjectId(nextHit.id);
          editor.setSelectedObjectIds([nextHit.id]);
        }
      }
    },
    [editor, screenToCanvas],
  );

  const handleWallJunctionMouseDown = useCallback(
    (e: React.MouseEvent, junction: WallJunction) => {
      e.stopPropagation();
      if (editor.activeTool !== "select") return;
      editor.startDrag();
      setCornerDragState({
        connections: junction.connections.map((c) => ({ wallId: c.wallId, endpoint: c.endpoint })),
      });
      const ids = Array.from(new Set(junction.connections.map((c) => c.wallId)));
      editor.setSelectedObjectIds(ids);
      editor.setSelectedObjectId(ids[0] ?? null);
    },
    [editor],
  );

  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as Element;
      const isEmptyCanvas = target.tagName === "svg" || target.classList.contains("canvas-bg");

      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (e.button !== 0) return;

      // Box-select only (wall is now handled via click events)
      if (editor.activeTool === "select" && isEmptyCanvas) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setBoxSelectRect({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
        return;
      }

      // Zone tool: drag to define area size.
      if (editor.activeTool === "zone") {
        const pos = snapPoint(screenToCanvas(e.clientX, e.clientY));
        setZoneDraftRect({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
      }
    },
    [editor.activeTool, screenToCanvas, snapPoint],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToCanvas(e.clientX, e.clientY);

      if (cornerDragState) {
        const connected = new Set(cornerDragState.connections.map((c) => `${c.wallId}:${c.endpoint}`));
        const snapCandidates = getWallEndpoints(editor.objects).filter(
          (ep) => !connected.has(`${ep.wallId}:${ep.endpoint}`),
        );
        const snapped = nearestWallEndpoint(pos, snapCandidates);
        const nextPoint = snapped ?? pos;
        editor.moveWallCorners(
          cornerDragState.connections.map((c) => ({
            wallId: c.wallId,
            endpoint: c.endpoint,
            point: nextPoint,
          })),
        );
        return;
      }

      if (resizeState) {
        if (resizeState.wallFixedPoint && resizeState.wallMovingEndpoint) {
          let movingPoint: Point = pos;
          const snapped = nearestWallEndpoint(pos, resizeState.wallSnapEndpoints ?? []);
          if (snapped) movingPoint = snapped;
          if (e.shiftKey) {
            movingPoint = snapToOrthogonal(resizeState.wallFixedPoint, movingPoint);
          }

          const thickness = resizeState.initHeight;
          const fixed = resizeState.wallFixedPoint;
          const start = resizeState.wallMovingEndpoint === "start" ? movingPoint : fixed;
          const end = resizeState.wallMovingEndpoint === "end" ? movingPoint : fixed;
          editor.resizeObject(resizeState.id, wallRectFromEndpoints(start, end, thickness));
          return;
        }

        const dx = pos.x - resizeState.startMouseX;
        const dy = pos.y - resizeState.startMouseY;
        editor.resizeObject(resizeState.id, calcResize(resizeState, dx, dy));
        return;
      }

      if (rotationState) {
        const angle = Math.atan2(pos.y - rotationState.centerY, pos.x - rotationState.centerX) * (180 / Math.PI);
        const rawRotation = rotationState.initRotation + (angle - rotationState.startAngle);
        const snappedRotation = e.shiftKey ? Math.round(rawRotation / 90) * 90 : rawRotation;
        editor.rotateObject(rotationState.id, snappedRotation);
        return;
      }

      if (activeWallState?.hasStart) {
        let nextPoint: Point = pos;
        const endpointSnap = nearestWallEndpoint(pos, wallEndpoints);
        if (endpointSnap) {
          nextPoint = endpointSnap;
        }
        if (e.shiftKey) {
          nextPoint = snapToOrthogonal({ x: activeWallState.startX, y: activeWallState.startY }, nextPoint);
        }
        setActiveWallState({ ...activeWallState, currentX: nextPoint.x, currentY: nextPoint.y });
        return;
      }
      if (boxSelectRect) {
        setBoxSelectRect((prev) => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
        return;
      }

      if (zoneDraftRect) {
        const snapped = snapPoint(pos);
        setZoneDraftRect((prev) => (prev ? { ...prev, currentX: snapped.x, currentY: snapped.y } : null));
        return;
      }

      if (draggingId && dragStart) {
        const dx = pos.x - dragStart.x;
        const dy = pos.y - dragStart.y;
        for (const item of dragStart.items) {
          editor.moveObject(item.id, item.objX + dx, item.objY + dy, true);
        }
        return;
      }

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        editor.setPanOffset({ x: editor.panOffset.x + dx, y: editor.panOffset.y + dy });
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [cornerDragState, resizeState, rotationState, activeWallState, setActiveWallState, wallEndpoints, boxSelectRect, zoneDraftRect, snapPoint, draggingId, dragStart, isPanning, panStart, editor, screenToCanvas],
  );

  const handleMouseUp = useCallback(
    () => {
      if (cornerDragState) {
        editor.endDrag();
        setCornerDragState(null);
        suppressNextClick.current = true;
        return;
      }

      if (resizeState) {
        editor.endDrag();
        setResizeState(null);
        suppressNextClick.current = true;
        return;
      }

      if (rotationState) {
        editor.endDrag();
        setRotationState(null);
        suppressNextClick.current = true;
        return;
      }

      // Wall is committed via click, not mouseup — nothing to do here

      if (boxSelectRect) {
        const minX = Math.min(boxSelectRect.startX, boxSelectRect.currentX);
        const maxX = Math.max(boxSelectRect.startX, boxSelectRect.currentX);
        const minY = Math.min(boxSelectRect.startY, boxSelectRect.currentY);
        const maxY = Math.max(boxSelectRect.startY, boxSelectRect.currentY);
        const selected = editor.objects
          .filter((obj) => obj.x < maxX && obj.x + obj.width > minX && obj.y < maxY && obj.y + obj.height > minY)
          .map((obj) => obj.id);
        if (selected.length > 0) {
          editor.setSelectedObjectIds(selected);
          editor.setSelectedObjectId(selected[0]);
          suppressNextClick.current = true;
        }
        setBoxSelectRect(null);
        return;
      }

      if (zoneDraftRect) {
        const minX = Math.min(zoneDraftRect.startX, zoneDraftRect.currentX);
        const maxX = Math.max(zoneDraftRect.startX, zoneDraftRect.currentX);
        const minY = Math.min(zoneDraftRect.startY, zoneDraftRect.currentY);
        const maxY = Math.max(zoneDraftRect.startY, zoneDraftRect.currentY);
        const width = Math.max(MIN_OBJECT_SIZE, maxX - minX);
        const height = Math.max(MIN_OBJECT_SIZE, maxY - minY);

        editor.addObject("zone", minX, minY, {
          width,
          height,
          label: "Area Highlight",
        });

        setZoneDraftRect(null);
        suppressNextClick.current = true;
        return;
      }

      if (draggingId) {
        const draggedObj = editor.objects.find((o) => o.id === draggingId);
        if (draggedObj?.type === "door") {
          const cx = draggedObj.x + draggedObj.width / 2;
          const cy = draggedObj.y + draggedObj.height / 2;
          const targetWall = findNearestWallForPoint(editor.objects, { x: cx, y: cy }, DOOR_ATTACH_MAX_DISTANCE);
          if (targetWall) {
            editor.attachDoorToWall(draggingId, targetWall.id, { anchorPoint: { x: cx, y: cy } });
          }
        }
        if (draggedObj?.type === "chair") {
          const cx = draggedObj.x + draggedObj.width / 2;
          const cy = draggedObj.y + draggedObj.height / 2;
          const targetTable = editor.objects.find(
            (o) =>
              o.type === "table" &&
              cx >= o.x && cx <= o.x + o.width &&
              cy >= o.y && cy <= o.y + o.height,
          );
          if (targetTable) {
            const preferredSide = tableSideFromPoint(targetTable, { x: cx, y: cy });

            if (draggedObj.parentId === targetTable.id) {
              // Move only one chair side-to-side (delta 1), keep others in place.
              editor.moveChairWithinTable(draggingId, targetTable.id, preferredSide);
            } else if (!draggedObj.parentId) {
              editor.assignChairToTable(draggingId, targetTable.id, preferredSide);
            }
          }
        }
        editor.endDrag();
        requestAnimationFrame(() => setDraggingId(null));
        setDragStart(null);
      }
      setIsPanning(false);
    },
    [cornerDragState, resizeState, rotationState, boxSelectRect, zoneDraftRect, draggingId, editor],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        editor.setZoom(editor.zoom + (e.deltaY > 0 ? -0.1 : 0.1));
      }
    },
    [editor],
  );

  const gridSize = editor.gridSize;
  const sortedObjects = [...editor.objects].sort((a, b) => {
    if (a.type === "zone" && b.type !== "zone") return -1;
    if (a.type !== "zone" && b.type === "zone") return 1;
    return 0;
  });

  const isAnyInteracting = !!(resizeState || rotationState || activeWallState);
  const cursorClass =
    isPanning ? "cursor-grabbing"
    : editor.activeTool === "wall" ? "cursor-crosshair"
    : editor.activeTool !== "select" ? "cursor-crosshair"
    : isAnyInteracting ? "cursor-default"
    : "cursor-default";

  // Wall preview (only when we have a start anchor)
  const wallPreviewLength = activeWallState?.hasStart
    ? Math.sqrt(
        (activeWallState.currentX - activeWallState.startX) ** 2 +
        (activeWallState.currentY - activeWallState.startY) ** 2,
      )
    : 0;

  // Box-select display rect
  const bsRect = boxSelectRect ? {
    x: Math.min(boxSelectRect.startX, boxSelectRect.currentX),
    y: Math.min(boxSelectRect.startY, boxSelectRect.currentY),
    width: Math.abs(boxSelectRect.currentX - boxSelectRect.startX),
    height: Math.abs(boxSelectRect.currentY - boxSelectRect.startY),
  } : null;

  const zoneRect = zoneDraftRect ? {
    x: Math.min(zoneDraftRect.startX, zoneDraftRect.currentX),
    y: Math.min(zoneDraftRect.startY, zoneDraftRect.currentY),
    width: Math.abs(zoneDraftRect.currentX - zoneDraftRect.startX),
    height: Math.abs(zoneDraftRect.currentY - zoneDraftRect.startY),
  } : null;

  return (
    <div className="relative flex-1 overflow-hidden bg-muted/30 rounded-lg border">
      {/* Zoom indicator */}
      <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        {Math.round(editor.zoom * 100)}%
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className={cursorClass}
        onClick={handleCanvasClick}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ minHeight: "100%" }}
      >
        <g transform={`translate(${editor.panOffset.x}, ${editor.panOffset.y}) scale(${editor.zoom})`}>
          {/* Infinite dot-grid background */}
          <defs>
            <pattern id="grid-dots" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <circle cx={gridSize / 2} cy={gridSize / 2} r={0.8} fill="#cbd5e1" />
            </pattern>
          </defs>
          <rect
            x={-INFINITE_SIZE / 2}
            y={-INFINITE_SIZE / 2}
            width={INFINITE_SIZE}
            height={INFINITE_SIZE}
            fill={editor.snapToGrid ? "url(#grid-dots)" : "white"}
            className="canvas-bg"
          />

          {/* Canvas objects */}
          {sortedObjects.map((obj) => (
            <CanvasObject
              key={obj.id}
              object={obj}
              isSelected={obj.id === editor.selectedObjectId || editor.selectedObjectIds.includes(obj.id)}
              onMouseDown={handleObjectMouseDown}
              onClick={handleObjectClick}
              onResizeStart={handleResizeStart}
              onRotateStart={handleRotateStart}
            />
          ))}

          {/* Wall endpoints helper dots in wall mode */}
          {editor.activeTool === "wall" && wallEndpoints.map((ep) => (
            <circle
              key={`${ep.wallId}_${ep.endpoint}`}
              cx={ep.x}
              cy={ep.y}
              r={4}
              fill="#0ea5e9"
              opacity={0.8}
              className="pointer-events-none"
            />
          ))}

          {/* Wall junction nodes in select mode (Corel-like corner editing) */}
          {editor.activeTool === "select" && wallJunctions.map((junction) => (
            <g key={junction.id}>
              <circle
                cx={junction.x}
                cy={junction.y}
                r={6}
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth={1.5}
                opacity={0.9}
                style={{ cursor: "move" }}
                onMouseDown={(e) => handleWallJunctionMouseDown(e, junction)}
              />
              <circle
                cx={junction.x}
                cy={junction.y}
                r={2.2}
                fill="#0284c7"
                className="pointer-events-none"
              />
            </g>
          ))}

          {/* Wall anchor + preview */}
          {activeWallState?.hasStart && (
            <>
              {/* Anchor dot at start */}
              <circle
                cx={activeWallState.startX}
                cy={activeWallState.startY}
                r={5}
                fill="#3b82f6"
                opacity={0.9}
                className="pointer-events-none"
              />
              {wallPreviewLength > 5 && (
                <>
                  <line
                    x1={activeWallState.startX}
                    y1={activeWallState.startY}
                    x2={activeWallState.currentX}
                    y2={activeWallState.currentY}
                    stroke="#475569"
                    strokeWidth={WALL_THICKNESS}
                    strokeLinecap="square"
                    opacity={0.45}
                    className="pointer-events-none"
                  />
                  {/* End cursor dot */}
                  <circle
                    cx={activeWallState.currentX}
                    cy={activeWallState.currentY}
                    r={4}
                    fill="#475569"
                    opacity={0.7}
                    className="pointer-events-none"
                  />
                </>
              )}
            </>
          )}

          {/* Box-select preview */}
          {bsRect && (
            <rect
              x={bsRect.x}
              y={bsRect.y}
              width={bsRect.width}
              height={bsRect.height}
              fill="rgba(59,130,246,0.08)"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 2"
              className="pointer-events-none"
            />
          )}

          {/* Zone drag-create preview */}
          {zoneRect && (
            <rect
              x={zoneRect.x}
              y={zoneRect.y}
              width={Math.max(1, zoneRect.width)}
              height={Math.max(1, zoneRect.height)}
              fill="rgba(59,130,246,0.12)"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

      {editor.objects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground/60">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto mb-3 opacity-50"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <p className="text-sm font-medium">Click a tool, then click the canvas to place objects</p>
            <p className="text-xs mt-1">Wall tool: click endpoints to chain • Hold Shift for straight wall / 90° rotate snap • Shift+click or drag to multi-select • Ctrl+C/V copy-paste • Ctrl+scroll to zoom</p>
          </div>
        </div>
      )}
    </div>
  );
}
