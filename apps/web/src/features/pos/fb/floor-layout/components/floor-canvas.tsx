"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { LayoutObject, LayoutObjectType } from "../types";
import type { ResizeHandle } from "./canvas-object";
import { CanvasObject } from "./canvas-object";
import type { useCanvasEditor } from "../hooks/use-canvas-editor";

type CanvasEditorReturn = ReturnType<typeof useCanvasEditor>;

import "@/features/pos/fb/pos-fb-theme.module.css";

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

interface AlignmentGuide {
  type: "horizontal" | "vertical";
  coordinate: number;
}

function snapToOrthogonal(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: end.x, y: start.y }
    : { x: start.x, y: end.y };
}

function snapToCleanAngle(start: Point, current: Point): Point {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 8) return current;

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalized = ((angleDeg % 360) + 360) % 360;

  const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  const TOLERANCE = 4.5; // degrees

  for (const snap of snapAngles) {
    if (Math.abs(normalized - snap) <= TOLERANCE) {
      const rad = (snap * Math.PI) / 180;
      return {
        x: start.x + length * Math.cos(rad),
        y: start.y + length * Math.sin(rad),
      };
    }
  }

  return current;
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
  const isVerticalAspect = wall.height > wall.width;
  const length = isVerticalAspect ? wall.height : wall.width;
  const baseAngle = isVerticalAspect ? (wall.rotation + 90) : wall.rotation;
  const centerX = wall.x + wall.width / 2;
  const centerY = wall.y + wall.height / 2;
  const halfLength = length / 2;
  const angle = (baseAngle * Math.PI) / 180;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  return {
    start: { x: centerX - ux * halfLength, y: centerY - uy * halfLength },
    end: { x: centerX + ux * halfLength, y: centerY + uy * halfLength },
  };
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

function doesObjectIntersectRect(
  obj: LayoutObject,
  rect: { minX: number; maxX: number; minY: number; maxY: number },
): boolean {
  // If no rotation, simple AABB overlap
  if (!obj.rotation || obj.rotation % 360 === 0) {
    return (
      obj.x < rect.maxX &&
      obj.x + obj.width > rect.minX &&
      obj.y < rect.maxY &&
      obj.y + obj.height > rect.minY
    );
  }

  // Center and half-extents
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const hw = obj.width / 2;
  const hh = obj.height / 2;

  const rad = (obj.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 4 corners of the oriented object
  const corners = [
    { x: cx + (-hw * cos - -hh * sin), y: cy + (-hw * sin + -hh * cos) },
    { x: cx + ( hw * cos - -hh * sin), y: cy + ( hw * sin + -hh * cos) },
    { x: cx + ( hw * cos -  hh * sin), y: cy + ( hw * sin +  hh * cos) },
    { x: cx + (-hw * cos -  hh * sin), y: cy + (-hw * sin +  hh * cos) },
  ];

  // Axis 1: World X axis
  let objMinX = corners[0].x;
  let objMaxX = corners[0].x;
  for (let i = 1; i < 4; i++) {
    if (corners[i].x < objMinX) objMinX = corners[i].x;
    if (corners[i].x > objMaxX) objMaxX = corners[i].x;
  }
  if (objMaxX < rect.minX || objMinX > rect.maxX) return false;

  // Axis 2: World Y axis
  let objMinY = corners[0].y;
  let objMaxY = corners[0].y;
  for (let i = 1; i < 4; i++) {
    if (corners[i].y < objMinY) objMinY = corners[i].y;
    if (corners[i].y > objMaxY) objMaxY = corners[i].y;
  }
  if (objMaxY < rect.minY || objMinY > rect.maxY) return false;

  // Axis 3: Object local U axis (cos, sin)
  const rectCorners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];

  let rMinU = Infinity;
  let rMaxU = -Infinity;
  for (const rc of rectCorners) {
    const proj = rc.x * cos + rc.y * sin;
    if (proj < rMinU) rMinU = proj;
    if (proj > rMaxU) rMaxU = proj;
  }
  const objCenterU = cx * cos + cy * sin;
  if (rMaxU < objCenterU - hw || rMinU > objCenterU + hw) return false;

  // Axis 4: Object local V axis (-sin, cos)
  let rMinV = Infinity;
  let rMaxV = -Infinity;
  for (const rc of rectCorners) {
    const proj = -rc.x * sin + rc.y * cos;
    if (proj < rMinV) rMinV = proj;
    if (proj > rMaxV) rMaxV = proj;
  }
  const objCenterV = -cx * sin + cy * cos;
  if (rMaxV < objCenterV - hh || rMinV > objCenterV + hh) return false;

  return true;
}

interface ClosestWallSnap {
  wall: LayoutObject;
  snappedCenter: Point;
  wallAngle: number;
  wallThickness: number;
  distance: number;
}

function findClosestWallForDoor(
  point: Point,
  objects: LayoutObject[],
  maxDistance = 20,
): ClosestWallSnap | null {
  let best: ClosestWallSnap | null = null;
  let minDistance = maxDistance;

  for (const obj of objects) {
    if (obj.type !== "wall") continue;
    const seg = wallSegmentFromObject(obj);
    const vx = seg.end.x - seg.start.x;
    const vy = seg.end.y - seg.start.y;
    const wx = point.x - seg.start.x;
    const wy = point.y - seg.start.y;
    const len2 = vx * vx + vy * vy;
    if (len2 <= 0.0001) continue;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
    const proj = { x: seg.start.x + t * vx, y: seg.start.y + t * vy };
    const dist = distance(point, proj);
    const isVerticalAspect = obj.height > obj.width;
    const thickness = isVerticalAspect ? obj.width : (obj.thickness ?? obj.height ?? WALL_THICKNESS);
    const threshold = Math.max(maxDistance, thickness / 2 + 8);

    if (dist <= threshold && dist < minDistance) {
      minDistance = dist;
      const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
      best = {
        wall: obj,
        snappedCenter: proj,
        wallAngle: ((angle % 360) + 360) % 360,
        wallThickness: thickness,
        distance: dist,
      };
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
  const t = useTranslations("floorLayout.editor");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mouseScreenRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<DragStartState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [rotationState, setRotationState] = useState<RotationState | null>(null);
  const [cornerDragState, setCornerDragState] = useState<CornerDragState | null>(null);
  const [boxSelectRect, setBoxSelectRect] = useState<BoxSelectRect | null>(null);
  const [zoneDraftRect, setZoneDraftRect] = useState<ZoneDraftRect | null>(null);
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const [snappedWallId, setSnappedWallId] = useState<string | null>(null);
  const [isPaletteDragging, setIsPaletteDragging] = useState(false);
  const [toolGhostPreview, setToolGhostPreview] = useState<{
    type: LayoutObjectType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    isSnappedToWall: boolean;
    snappedWallId?: string;
  } | null>(null);
  const pendingDoorSnapRef = useRef<{
    doorId: string;
    wallId: string;
    anchorPoint: Point;
  } | null>(null);
  const suppressNextClick = useRef(false);
  const hasMovedRef = useRef(false);
  const hasAutoCenteredRef = useRef<string | null>(null);

  const { floorPlanId, objects, fitToView } = editor;

  // Auto-fit and center layout when opening or when objects load
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const checkAndFit = (width: number, height: number) => {
      if (width > 0 && height > 0 && objects.length > 0) {
        if (hasAutoCenteredRef.current !== floorPlanId) {
          hasAutoCenteredRef.current = floorPlanId ?? "loaded";
          fitToView(width, height);
        }
      }
    };

    checkAndFit(el.clientWidth, el.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        checkAndFit(width, height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [floorPlanId, objects.length, fitToView]);

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

  const computeDoorSnap = useCallback(
    (point: Point, doorLength = 60) => {
      const snap = findClosestWallForDoor(point, editor.objects, 20);
      if (!snap) {
        return {
          x: point.x - doorLength / 2,
          y: point.y - WALL_THICKNESS / 2,
          width: doorLength,
          height: WALL_THICKNESS,
          rotation: 0,
          isSnappedToWall: false,
          snappedWallId: null,
          snappedCenter: point,
        };
      }
      return {
        x: snap.snappedCenter.x - doorLength / 2,
        y: snap.snappedCenter.y - snap.wallThickness / 2,
        width: doorLength,
        height: snap.wallThickness,
        rotation: snap.wallAngle,
        isSnappedToWall: true,
        snappedWallId: snap.wall.id,
        snappedCenter: snap.snappedCenter,
      };
    },
    [editor.objects],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsPaletteDragging(true);

      const pos = screenToCanvas(e.clientX, e.clientY);
      const activeTool = editor.activeTool as string;
      const toolType = (activeTool !== "select" ? activeTool : "door") as LayoutObjectType;

      if (toolType === "door") {
        const snap = computeDoorSnap(pos, 60);
        setSnappedWallId(snap.isSnappedToWall ? (snap.snappedWallId ?? null) : null);
        setToolGhostPreview({
          type: "door",
          x: snap.x,
          y: snap.y,
          width: snap.width,
          height: snap.height,
          rotation: snap.rotation,
          isSnappedToWall: snap.isSnappedToWall,
          snappedWallId: snap.snappedWallId ?? undefined,
        });
      } else {
        setSnappedWallId(null);
        setToolGhostPreview({
          type: toolType,
          x: pos.x - 40,
          y: pos.y - 30,
          width: 80,
          height: 60,
          rotation: 0,
          isSnappedToWall: false,
        });
      }
    },
    [editor.activeTool, screenToCanvas, computeDoorSnap],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsPaletteDragging(false);
    setToolGhostPreview(null);
    setSnappedWallId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsPaletteDragging(false);
      setToolGhostPreview(null);
      setSnappedWallId(null);

      const rawTool =
        e.dataTransfer.getData("application/pos-tool") ||
        e.dataTransfer.getData("text/plain") ||
        (editor.activeTool as string);

      if (!rawTool || rawTool === "select") return;
      const toolType = rawTool as LayoutObjectType;

      const pos = screenToCanvas(e.clientX, e.clientY);

      if (toolType === "door") {
        const snap = computeDoorSnap(pos, 60);
        const newDoorId = editor.addObject("door", snap.x, snap.y, {
          width: snap.width,
          height: snap.height,
          doorWidth: snap.width,
          rotation: snap.rotation,
          parentId: snap.isSnappedToWall && snap.snappedWallId ? snap.snappedWallId : undefined,
        });
        if (snap.isSnappedToWall && snap.snappedWallId) {
          editor.attachDoorToWall(newDoorId, snap.snappedWallId, {
            anchorPoint: snap.snappedCenter,
            skipUndo: true,
          });
        }
        editor.setSelectedObjectId(newDoorId);
        editor.setSelectedObjectIds([newDoorId]);
        editor.setActiveTool("select");
        return;
      }

      if (toolType === "wall") {
        editor.setActiveTool("wall");
        return;
      }

      const snapped = snapPoint(pos);
      const newId = editor.addObject(toolType, snapped.x, snapped.y);
      editor.setSelectedObjectId(newId);
      editor.setSelectedObjectIds([newId]);
      editor.setActiveTool("select");
    },
    [editor, screenToCanvas, snapPoint, computeDoorSnap],
  );

  // Auto-scroll (Draw.io style): when dragging or drawing near viewport boundaries
  useEffect(() => {
    const isInteracting = !!(
      draggingId ||
      resizeState ||
      rotationState ||
      cornerDragState ||
      editor.wallDrawing?.hasStart ||
      boxSelectRect ||
      zoneDraftRect
    );
    if (!isInteracting) {
      mouseScreenRef.current = null;
      return;
    }

    let rafId: number;
    const checkAndScroll = () => {
      if (containerRef.current && mouseScreenRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const { clientX, clientY } = mouseScreenRef.current;
        const EDGE_THRESHOLD = 45;
        const MAX_SPEED = 12;

        let deltaX = 0;
        let deltaY = 0;

        if (clientX < rect.left + EDGE_THRESHOLD) {
          const factor = (rect.left + EDGE_THRESHOLD - clientX) / EDGE_THRESHOLD;
          deltaX = Math.min(MAX_SPEED, factor * MAX_SPEED);
        } else if (clientX > rect.right - EDGE_THRESHOLD) {
          const factor = (clientX - (rect.right - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
          deltaX = -Math.min(MAX_SPEED, factor * MAX_SPEED);
        }

        if (clientY < rect.top + EDGE_THRESHOLD) {
          const factor = (rect.top + EDGE_THRESHOLD - clientY) / EDGE_THRESHOLD;
          deltaY = Math.min(MAX_SPEED, factor * MAX_SPEED);
        } else if (clientY > rect.bottom - EDGE_THRESHOLD) {
          const factor = (clientY - (rect.bottom - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
          deltaY = -Math.min(MAX_SPEED, factor * MAX_SPEED);
        }

        if (deltaX !== 0 || deltaY !== 0) {
          editor.setPanOffset({
            x: editor.panOffset.x + deltaX,
            y: editor.panOffset.y + deltaY,
          });
        }
      }
      rafId = requestAnimationFrame(checkAndScroll);
    };

    rafId = requestAnimationFrame(checkAndScroll);
    return () => cancelAnimationFrame(rafId);
  }, [
    draggingId,
    resizeState,
    rotationState,
    cornerDragState,
    editor.wallDrawing?.hasStart,
    boxSelectRect,
    zoneDraftRect,
    editor,
  ]);

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

      if (tool === "door") {
        const snap = computeDoorSnap(pos, 60);
        const newDoorId = editor.addObject("door", snap.x, snap.y, {
          width: snap.width,
          height: snap.height,
          doorWidth: snap.width,
          rotation: snap.rotation,
          parentId: snap.isSnappedToWall && snap.snappedWallId ? snap.snappedWallId : undefined,
        });
        if (snap.isSnappedToWall && snap.snappedWallId) {
          editor.attachDoorToWall(newDoorId, snap.snappedWallId, {
            anchorPoint: snap.snappedCenter,
            skipUndo: true,
          });
        }
        editor.setSelectedObjectId(newDoorId);
        editor.setSelectedObjectIds([newDoorId]);
        editor.setActiveTool("select");
        setToolGhostPreview(null);
        setSnappedWallId(null);
        return;
      }

      // Zone tool uses drag-to-create rectangle, not click placement.
      if (tool === "zone") {
        return;
      }

      const newId = editor.addObject(tool as LayoutObjectType, pos.x, pos.y);
      editor.setSelectedObjectId(newId);
      editor.setSelectedObjectIds([newId]);
      editor.setActiveTool("select");
      setToolGhostPreview(null);
    },
    [editor, screenToCanvas, draggingId, activeWallState, setActiveWallState, wallEndpoints, computeDoorSnap],
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
      hasMovedRef.current = false;
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
          const snap = computeDoorSnap(pos, 60);
          const doorId = editor.addObject("door", snap.x, snap.y, {
            width: snap.width,
            height: snap.height,
            doorWidth: snap.width,
            rotation: snap.rotation,
            parentId: target.id,
          });
          editor.attachDoorToWall(doorId, target.id, { anchorPoint: snap.snappedCenter, skipUndo: true });
          editor.setSelectedObjectId(doorId);
          editor.setSelectedObjectIds([doorId]);
          editor.setActiveTool("select");
          setToolGhostPreview(null);
          setSnappedWallId(null);
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
    [editor, screenToCanvas, computeDoorSnap],
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
      mouseScreenRef.current = { clientX: e.clientX, clientY: e.clientY };
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
          const newGuides: AlignmentGuide[] = [];

          if (snapped) {
            movingPoint = snapped;
            newGuides.push({ type: "horizontal", coordinate: snapped.y });
            newGuides.push({ type: "vertical", coordinate: snapped.x });
          } else {
            for (const ep of (resizeState.wallSnapEndpoints ?? [])) {
              if (Math.abs(movingPoint.y - ep.y) <= 6) {
                movingPoint.y = ep.y;
                newGuides.push({ type: "horizontal", coordinate: ep.y });
                break;
              }
            }
            for (const ep of (resizeState.wallSnapEndpoints ?? [])) {
              if (Math.abs(movingPoint.x - ep.x) <= 6) {
                movingPoint.x = ep.x;
                newGuides.push({ type: "vertical", coordinate: ep.x });
                break;
              }
            }

            if (e.shiftKey) {
              movingPoint = snapToOrthogonal(resizeState.wallFixedPoint, movingPoint);
            } else {
              movingPoint = snapToCleanAngle(resizeState.wallFixedPoint, movingPoint);
            }
          }

          setActiveGuides(newGuides);
          const thickness = resizeState.initHeight;
          const fixed = resizeState.wallFixedPoint;
          const start = resizeState.wallMovingEndpoint === "start" ? movingPoint : fixed;
          const end = resizeState.wallMovingEndpoint === "end" ? movingPoint : fixed;
          editor.resizeObject(resizeState.id, wallRectFromEndpoints(start, end, thickness));
          return;
        }

        const dx = pos.x - resizeState.startMouseX;
        const dy = pos.y - resizeState.startMouseY;

        const targetObj = editor.objects.find((o) => o.id === resizeState.id);
        if (targetObj?.type === "door") {
          const rad = (targetObj.rotation * Math.PI) / 180;
          const ux = Math.cos(rad);
          const uy = Math.sin(rad);
          const deltaLen = dx * ux + dy * uy;
          const change = resizeState.handle === "e" ? deltaLen * 2 : -deltaLen * 2;
          const newWidth = Math.max(20, Math.round(resizeState.initWidth + change));
          const cx = resizeState.initX + resizeState.initWidth / 2;
          const cy = resizeState.initY + resizeState.initHeight / 2;
          editor.resizeObject(resizeState.id, {
            x: cx - newWidth / 2,
            y: cy - resizeState.initHeight / 2,
            width: newWidth,
            height: resizeState.initHeight,
          });
          return;
        }

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
        const newGuides: AlignmentGuide[] = [];

        if (endpointSnap) {
          nextPoint = endpointSnap;
          newGuides.push({ type: "horizontal", coordinate: endpointSnap.y });
          newGuides.push({ type: "vertical", coordinate: endpointSnap.x });
        } else {
          // Check alignment guides against wall endpoints
          let alignedY = false;
          let alignedX = false;
          for (const ep of wallEndpoints) {
            if (!alignedY && Math.abs(nextPoint.y - ep.y) <= 6) {
              nextPoint.y = ep.y;
              alignedY = true;
              newGuides.push({ type: "horizontal", coordinate: ep.y });
            }
            if (!alignedX && Math.abs(nextPoint.x - ep.x) <= 6) {
              nextPoint.x = ep.x;
              alignedX = true;
              newGuides.push({ type: "vertical", coordinate: ep.x });
            }
          }

          if (e.shiftKey) {
            nextPoint = snapToOrthogonal({ x: activeWallState.startX, y: activeWallState.startY }, nextPoint);
          } else {
            nextPoint = snapToCleanAngle({ x: activeWallState.startX, y: activeWallState.startY }, nextPoint);
          }
        }
        setActiveGuides(newGuides);
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

      if (editor.activeTool === "door") {
        const snap = computeDoorSnap(pos, 60);
        setSnappedWallId(snap.isSnappedToWall ? (snap.snappedWallId ?? null) : null);
        setToolGhostPreview({
          type: "door",
          x: snap.x,
          y: snap.y,
          width: snap.width,
          height: snap.height,
          rotation: snap.rotation,
          isSnappedToWall: snap.isSnappedToWall,
          snappedWallId: snap.snappedWallId ?? undefined,
        });
      }

      if (draggingId && dragStart) {
        const dx = pos.x - dragStart.x;
        const dy = pos.y - dragStart.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          hasMovedRef.current = true;
        }
        const draggedObj = editor.objects.find((o) => o.id === draggingId);

        if (draggedObj?.type === "door" && dragStart.items.length === 1) {
          const item = dragStart.items[0];
          const doorLen = draggedObj.doorWidth ?? draggedObj.width ?? 60;
          const rawCenterX = item.objX + dx + doorLen / 2;
          const rawCenterY = item.objY + dy + (draggedObj.height ?? WALL_THICKNESS) / 2;
          const snap = computeDoorSnap({ x: rawCenterX, y: rawCenterY }, doorLen);

          if (snap.isSnappedToWall && snap.snappedWallId) {
            setSnappedWallId(snap.snappedWallId);
            pendingDoorSnapRef.current = {
              doorId: draggedObj.id,
              wallId: snap.snappedWallId,
              anchorPoint: snap.snappedCenter,
            };
            editor.moveDoorWithSnap(draggedObj.id, snap);
            return;
          } else {
            setSnappedWallId(null);
            pendingDoorSnapRef.current = null;
            editor.moveDoorWithSnap(draggedObj.id, {
              x: item.objX + dx,
              y: item.objY + dy,
              rotation: draggedObj.rotation,
              isSnappedToWall: false,
              snappedWallId: null,
            });
            return;
          }
        }

        editor.moveObjects(
          dragStart.items.map((item) => ({
            id: item.id,
            x: item.objX + dx,
            y: item.objY + dy,
          })),
          true,
        );
        return;
      }

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        editor.setPanOffset({ x: editor.panOffset.x + dx, y: editor.panOffset.y + dy });
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [
      cornerDragState,
      resizeState,
      rotationState,
      activeWallState,
      setActiveWallState,
      wallEndpoints,
      boxSelectRect,
      zoneDraftRect,
      snapPoint,
      draggingId,
      dragStart,
      isPanning,
      panStart,
      editor,
      screenToCanvas,
      computeDoorSnap,
    ],
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
        const rect = { minX, maxX, minY, maxY };
        const selected = editor.objects
          .filter((obj) => doesObjectIntersectRect(obj, rect))
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
        if (pendingDoorSnapRef.current) {
          const snap = pendingDoorSnapRef.current;
          editor.attachDoorToWall(snap.doorId, snap.wallId, {
            anchorPoint: snap.anchorPoint,
            skipUndo: true,
          });
          pendingDoorSnapRef.current = null;
        } else {
          const draggedObj = editor.objects.find((o) => o.id === draggingId);
          if (draggedObj?.type === "door") {
            const cx = draggedObj.x + draggedObj.width / 2;
            const cy = draggedObj.y + draggedObj.height / 2;
            const targetWall = findClosestWallForDoor({ x: cx, y: cy }, editor.objects, DOOR_ATTACH_MAX_DISTANCE);
            if (targetWall) {
              editor.attachDoorToWall(draggingId, targetWall.wall.id, {
                anchorPoint: targetWall.snappedCenter,
                skipUndo: true,
              });
            }
          }
        }
        setSnappedWallId(null);
        editor.endDrag();
        requestAnimationFrame(() => setDraggingId(null));
        setDragStart(null);
        if (hasMovedRef.current) {
          suppressNextClick.current = true;
          hasMovedRef.current = false;
        }
      }
      setActiveGuides([]);
      setIsPanning(false);
    },
    [cornerDragState, resizeState, rotationState, boxSelectRect, zoneDraftRect, draggingId, editor],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      editor.setZoom(Math.min(3, Math.max(0.3, +(editor.zoom - e.deltaY * 0.0008).toFixed(2))));
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
    : isPaletteDragging ? "cursor-copy"
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
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-background" onWheel={handleWheel}>
      {/* Zoom controls (matches Live Table UX) */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => editor.setZoom(Math.min(3, +(editor.zoom + 0.1).toFixed(2)))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-lg leading-none shadow hover:bg-accent transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (containerRef.current) {
              editor.fitToView(containerRef.current.clientWidth, containerRef.current.clientHeight);
            } else {
              editor.resetZoom();
            }
          }}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-[11px] font-medium shadow hover:bg-accent transition-colors"
          title="Reset zoom"
        >
          {Math.round(editor.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => editor.setZoom(Math.max(0.3, +(editor.zoom - 0.1).toFixed(2)))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-lg leading-none shadow hover:bg-accent transition-colors"
          title="Zoom out"
        >
          &minus;
        </button>
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: "100%" }}
      >
        <g transform={`translate(${editor.panOffset.x}, ${editor.panOffset.y}) scale(${editor.zoom})`}>
          {/* Infinite dot-grid background */}
          <defs>
            <pattern id="grid-dots" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <circle cx={gridSize / 2} cy={gridSize / 2} r={0.8} fill="var(--pos-grid-dot)" />
            </pattern>
          </defs>
          <rect
            x={-INFINITE_SIZE / 2}
            y={-INFINITE_SIZE / 2}
            width={INFINITE_SIZE}
            height={INFINITE_SIZE}
            fill={editor.snapToGrid ? "url(#grid-dots)" : "var(--pos-bg-fill)"}
            className="canvas-bg"
          />

          {/* Dynamic Alignment Guides (Draw.io / Figma style) */}
          {activeGuides.map((guide, idx) => (
            <line
              key={`guide-${guide.type}-${idx}`}
              x1={guide.type === "vertical" ? guide.coordinate : -INFINITE_SIZE / 2}
              y1={guide.type === "horizontal" ? guide.coordinate : -INFINITE_SIZE / 2}
              x2={guide.type === "vertical" ? guide.coordinate : INFINITE_SIZE / 2}
              y2={guide.type === "horizontal" ? guide.coordinate : INFINITE_SIZE / 2}
              stroke="var(--color-primary, #3b82f6)"
              strokeWidth={1.2 / editor.zoom}
              strokeDasharray="4 3"
              className="pointer-events-none"
              opacity={0.85}
            />
          ))}

          {/* Canvas objects */}
          {sortedObjects.map((obj) => (
            <CanvasObject
              key={obj.id}
              object={obj}
              isSelected={obj.id === editor.selectedObjectId || editor.selectedObjectIds.includes(obj.id)}
              isHighlighted={
                obj.id === snappedWallId ||
                (obj.type === "door" && (
                  obj.id === editor.selectedObjectId ||
                  (!!snappedWallId && (obj.parentId === snappedWallId || obj.id === draggingId))
                ))
              }
              onMouseDown={handleObjectMouseDown}
              onClick={handleObjectClick}
              onResizeStart={handleResizeStart}
              onRotateStart={handleRotateStart}
            />
          ))}

          {/* Tool Ghost Preview (Drag from palette or tool placement) */}
          {toolGhostPreview && (
            <g
              transform={`translate(${toolGhostPreview.x}, ${toolGhostPreview.y}) rotate(${toolGhostPreview.rotation}, ${toolGhostPreview.width / 2}, ${toolGhostPreview.height / 2})`}
              className="pointer-events-none"
              opacity={0.85}
            >
              {toolGhostPreview.type === "door" ? (
                <>
                  <rect
                    x={0}
                    y={0}
                    width={toolGhostPreview.width}
                    height={toolGhostPreview.height}
                    fill={toolGhostPreview.isSnappedToWall ? "rgba(254, 240, 138, 0.7)" : "var(--pos-zone-preview-fill)"}
                    stroke={toolGhostPreview.isSnappedToWall ? "#eab308" : "var(--pos-zone-preview-stroke)"}
                    strokeWidth={toolGhostPreview.isSnappedToWall ? 2.5 : 1.5}
                    rx={2}
                    filter={toolGhostPreview.isSnappedToWall ? "drop-shadow(0 0 8px rgba(234, 179, 8, 0.9))" : undefined}
                  />
                  <path
                    d={`M 0,${toolGhostPreview.height} A ${toolGhostPreview.width},${toolGhostPreview.width} 0 0,1 ${toolGhostPreview.width},0`}
                    fill="none"
                    stroke={toolGhostPreview.isSnappedToWall ? "#ca8a04" : "var(--pos-zone-preview-stroke)"}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={toolGhostPreview.height}
                    stroke={toolGhostPreview.isSnappedToWall ? "#eab308" : "var(--pos-zone-preview-stroke)"}
                    strokeWidth={2}
                  />
                </>
              ) : (
                <rect
                  x={0}
                  y={0}
                  width={toolGhostPreview.width}
                  height={toolGhostPreview.height}
                  fill="var(--pos-zone-preview-fill)"
                  stroke="var(--pos-zone-preview-stroke)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  rx={4}
                />
              )}
            </g>
          )}

          {/* Wall endpoints helper dots in wall mode */}
          {editor.activeTool === "wall" && wallEndpoints.map((ep) => (
            <circle
              key={`${ep.wallId}_${ep.endpoint}`}
              cx={ep.x}
              cy={ep.y}
              r={4}
              fill="var(--pos-grid-highlight)"
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
                fill="var(--pos-handle-fill)"
                stroke="var(--pos-grid-highlight)"
                strokeWidth={1.5}
                opacity={0.9}
                style={{ cursor: "move" }}
                onMouseDown={(e) => handleWallJunctionMouseDown(e, junction)}
              />
              <circle
                cx={junction.x}
                cy={junction.y}
                r={2.2}
                fill="var(--pos-grid-highlight)"
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
                fill="var(--pos-accent)"
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
                    stroke="var(--pos-wall-fill)"
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
                    fill="var(--pos-wall-fill)"
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
              fill="var(--pos-zone-preview-fill)"
              stroke="var(--pos-zone-preview-stroke)"
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
              fill="var(--pos-zone-preview-fill)"
              stroke="var(--pos-zone-preview-stroke)"
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
            <p className="text-sm font-medium">{t("emptyCanvasHint")}</p>
            <p className="text-xs mt-1">{t("emptyCanvasSubhint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
