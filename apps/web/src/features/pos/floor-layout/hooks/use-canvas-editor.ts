import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import type { LayoutObject, LayoutObjectType, TableChairDistribution, TableChairLayout } from "../types";
import { useSaveLayoutData, usePublishFloorLayout } from "./use-floor-layouts";
import { useCanvasStore } from "../stores/use-canvas-store";

// Default dimensions for new objects per type
const OBJECT_DEFAULTS: Record<
  LayoutObjectType,
  Partial<LayoutObject>
> = {
  table: { width: 80, height: 80, tableShape: "rectangle", capacity: 4 },
  chair: { width: 30, height: 30 },
  wall: { width: 200, height: 10, thickness: 10 },
  door: { width: 60, height: 10, doorWidth: 60 },
  cashier: { width: 100, height: 60 },
  zone: { width: 200, height: 200, zoneType: "dining", color: "#3b82f6", opacity: 0.15 },
  decoration: { width: 40, height: 40 },
};

// Auto-incrementing table number tracker
let tableCounter = 0;

function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const CHAIR_SIZE = 24;
const CHAIR_OFFSET = 8;
const MIN_CHAIR_SPACING = CHAIR_SIZE + 8; // 32 px between chair centres
const DEFAULT_DOOR_LENGTH = OBJECT_DEFAULTS.door.width ?? 60;
type ChairSide = Exclude<TableChairLayout, "auto">;
const CHAIR_LAYOUT_SIDES: ChairSide[] = ["top", "right", "bottom", "left"];
const EMPTY_SIDE_DISTRIBUTION: TableChairDistribution = { top: 0, right: 0, bottom: 0, left: 0 };

interface Point {
  x: number;
  y: number;
}

type WallEndpointName = "start" | "end";

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

function wallRectFromEndpoints(start: Point, end: Point, thickness: number): { x: number; y: number; width: number; height: number; rotation: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
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

function projectPointToSegment(point: Point, start: Point, end: Point): Point {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const len2 = vx * vx + vy * vy;
  if (len2 <= 0.0001) return start;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return { x: start.x + t * vx, y: start.y + t * vy };
}

function alignAttachedDoorsToWalls(objects: LayoutObject[], changedWallIds?: Set<string>): LayoutObject[] {
  const wallById = new Map(
    objects
      .filter((o) => o.type === "wall")
      .map((w) => [w.id, w]),
  );

  return objects.map((obj) => {
    if (obj.type !== "door" || !obj.parentId) return obj;
    if (changedWallIds && !changedWallIds.has(obj.parentId)) return obj;

    const wall = wallById.get(obj.parentId);
    if (!wall) return obj;

    const wallSeg = wallSegmentFromObject(wall);
    const doorCenter = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
    const snappedCenter = projectPointToSegment(doorCenter, wallSeg.start, wallSeg.end);
    const wallAngle = Math.atan2(wallSeg.end.y - wallSeg.start.y, wallSeg.end.x - wallSeg.start.x) * (180 / Math.PI);

    const wallThickness = wall.thickness ?? wall.height;
    const doorLength = obj.doorWidth ?? obj.width ?? DEFAULT_DOOR_LENGTH;
    const finalDoorLength = Math.min(Math.max(1, doorLength), Math.max(1, wall.width));

    return {
      ...obj,
      x: snappedCenter.x - finalDoorLength / 2,
      y: snappedCenter.y - wallThickness / 2,
      width: finalDoorLength,
      height: wallThickness,
      thickness: wallThickness,
      doorWidth: finalDoorLength,
      rotation: ((wallAngle % 360) + 360) % 360,
    };
  });
}

function getTableSideCapacity(table: LayoutObject): TableChairDistribution {
  return {
    top: Math.max(1, Math.floor((table.width - 10) / MIN_CHAIR_SPACING)),
    right: Math.max(1, Math.floor((table.height - 10) / MIN_CHAIR_SPACING)),
    bottom: Math.max(1, Math.floor((table.width - 10) / MIN_CHAIR_SPACING)),
    left: Math.max(1, Math.floor((table.height - 10) / MIN_CHAIR_SPACING)),
  };
}

function evenDistribution(targetCount: number, sideCapacity: TableChairDistribution): TableChairDistribution {
  const dist: TableChairDistribution = { ...EMPTY_SIDE_DISTRIBUTION };
  let placed = 0;
  let idx = 0;
  while (placed < targetCount) {
    const side = CHAIR_LAYOUT_SIDES[idx % CHAIR_LAYOUT_SIDES.length];
    if (dist[side] < sideCapacity[side]) {
      dist[side] += 1;
      placed += 1;
    }
    idx += 1;
    if (idx > targetCount * 8) break;
  }
  return dist;
}

function normalizeDistribution(
  base: Partial<TableChairDistribution> | undefined,
  targetCount: number,
  sideCapacity: TableChairDistribution,
): TableChairDistribution {
  const dist: TableChairDistribution = {
    top: Math.max(0, Math.min(base?.top ?? 0, sideCapacity.top)),
    right: Math.max(0, Math.min(base?.right ?? 0, sideCapacity.right)),
    bottom: Math.max(0, Math.min(base?.bottom ?? 0, sideCapacity.bottom)),
    left: Math.max(0, Math.min(base?.left ?? 0, sideCapacity.left)),
  };

  let sum = dist.top + dist.right + dist.bottom + dist.left;

  while (sum > targetCount) {
    const side = CHAIR_LAYOUT_SIDES.reduce((best, cur) => (dist[cur] > dist[best] ? cur : best), "top");
    if (dist[side] === 0) break;
    dist[side] -= 1;
    sum -= 1;
  }

  let rr = 0;
  while (sum < targetCount) {
    const side = CHAIR_LAYOUT_SIDES[rr % CHAIR_LAYOUT_SIDES.length];
    if (dist[side] < sideCapacity[side]) {
      dist[side] += 1;
      sum += 1;
    }
    rr += 1;
    if (rr > targetCount * 8) break;
  }

  return dist;
}

function chairSideFromId(chairId: string): ChairSide | null {
  const slot = chairId.split("_c_")[1] ?? "";
  const key = slot.charAt(0);
  if (key === "t") return "top";
  if (key === "r") return "right";
  if (key === "b") return "bottom";
  if (key === "l") return "left";
  return null;
}

function inferDistributionFromChildren(objects: LayoutObject[], tableId: string): TableChairDistribution {
  const dist: TableChairDistribution = { ...EMPTY_SIDE_DISTRIBUTION };
  for (const obj of objects) {
    if (obj.type !== "chair" || obj.parentId !== tableId) continue;
    const side = chairSideFromId(obj.id);
    if (side) dist[side] += 1;
  }
  return dist;
}

function constrainTableState(table: LayoutObject, objects: LayoutObject[]): LayoutObject {
  if (table.type !== "table") return table;

  const maxCapacity = computeMaxCapacity(table);
  const currentCapacity = table.capacity ?? 4;
  const nextCapacity = Math.max(0, Math.min(currentCapacity, maxCapacity));

  if (table.tableShape === "circle") {
    return {
      ...table,
      capacity: nextCapacity,
      chairDistribution: undefined,
    };
  }

  const sideCapacity = getTableSideCapacity(table);
  const sourceDistribution = table.chairDistribution ?? inferDistributionFromChildren(objects, table.id);
  const nextDistribution = normalizeDistribution(sourceDistribution, nextCapacity, sideCapacity);

  return {
    ...table,
    capacity: nextCapacity,
    chairDistribution: nextDistribution,
  };
}

// Maximum chairs that can physically fit around a table
function computeMaxCapacity(table: LayoutObject): number {
  if (table.tableShape === "circle") {
    const r = Math.min(table.width, table.height) / 2 + CHAIR_OFFSET + CHAIR_SIZE / 2;
    return Math.max(1, Math.floor((2 * Math.PI * r) / MIN_CHAIR_SPACING));
  }
  const perSideH = Math.max(1, Math.floor((table.width - 10) / MIN_CHAIR_SPACING));
  const perSideV = Math.max(1, Math.floor((table.height - 10) / MIN_CHAIR_SPACING));
  return 2 * perSideH + 2 * perSideV;
}

// Generate exactly `capacity` chairs evenly around the table.
// Uses stable IDs (slot-based) so React doesn't remount on resize.
function generateChairsForTable(table: LayoutObject, capacity: number): LayoutObject[] {
  const max = computeMaxCapacity(table);
  const count = Math.min(capacity, max);
  const chairs: LayoutObject[] = [];

  const makeChair = (
    slot: string,
    x: number,
    y: number,
    rotation: number,
  ): LayoutObject => ({
    id: `${table.id}_c_${slot}`,
    type: "chair" as LayoutObjectType,
    parentId: table.id,
    x,
    y,
    width: CHAIR_SIZE,
    height: CHAIR_SIZE,
    rotation,
    locked: false,
  });

  if (table.tableShape === "circle") {
    const r = Math.min(table.width, table.height) / 2 + CHAIR_OFFSET + CHAIR_SIZE / 2;
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;
    for (let i = 0; i < count; i++) {
      const ang = (2 * Math.PI * i) / count - Math.PI / 2;
      chairs.push(
        makeChair(
          `${i}`,
          cx + r * Math.cos(ang) - CHAIR_SIZE / 2,
          cy + r * Math.sin(ang) - CHAIR_SIZE / 2,
          ((ang * 180) / Math.PI + 270) % 360,
        ),
      );
    }
    return chairs;
  }

  // Rectangle / Square
  const sideCapacity = getTableSideCapacity(table);
  const base = table.chairDistribution ?? evenDistribution(count, sideCapacity);
  const sideCount = normalizeDistribution(base, count, sideCapacity);

  const topCount = sideCount.top;
  const rightCount = sideCount.right;
  const bottomCount = sideCount.bottom;
  const leftCount = sideCount.left;

  for (let i = 0; i < topCount; i++) {
    const sp = table.width / (topCount + 1);
    chairs.push(makeChair(`t${i}`, table.x + sp * (i + 1) - CHAIR_SIZE / 2, table.y - CHAIR_SIZE - CHAIR_OFFSET, 180));
  }
  for (let i = 0; i < rightCount; i++) {
    const sp = table.height / (rightCount + 1);
    chairs.push(makeChair(`r${i}`, table.x + table.width + CHAIR_OFFSET, table.y + sp * (i + 1) - CHAIR_SIZE / 2, 270));
  }
  for (let i = 0; i < bottomCount; i++) {
    const sp = table.width / (bottomCount + 1);
    chairs.push(makeChair(`b${i}`, table.x + sp * (i + 1) - CHAIR_SIZE / 2, table.y + table.height + CHAIR_OFFSET, 0));
  }
  for (let i = 0; i < leftCount; i++) {
    const sp = table.height / (leftCount + 1);
    chairs.push(makeChair(`l${i}`, table.x - CHAIR_SIZE - CHAIR_OFFSET, table.y + sp * (i + 1) - CHAIR_SIZE / 2, 90));
  }
  return chairs;
}

// Pure helper: replace a table's auto-generated chairs in an objects array.
// Reads capacity and shape from the table object already in the array.
function rebuildChairs(objects: LayoutObject[], tableId: string): LayoutObject[] {
  const table = objects.find((o) => o.id === tableId);
  if (!table || table.type !== "table") return objects;
  const capacity = table.capacity ?? 4;
  const withoutOld = objects.filter((o) => o.parentId !== tableId);
  return [...withoutOld, ...generateChairsForTable(table, capacity)];
}

export function useCanvasEditor(floorPlanId: string) {
  const store = useCanvasStore();
  const saveLayoutMutation = useSaveLayoutData(floorPlanId);
  const publishMutation = usePublishFloorLayout();
  const isDraggingRef = useRef(false);

  // Initialize table counter from existing objects
  useEffect(() => {
    const maxTableNum = store.objects
      .filter((o) => o.type === "table" && o.tableNumber)
      .reduce((max, o) => Math.max(max, o.tableNumber ?? 0), 0);
    tableCounter = maxTableNum;
  }, [store.objects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Snap position to grid
  const snapToGrid = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      if (!store.snapToGrid || store.gridSize <= 0) return { x, y };
      return {
        x: Math.round(x / store.gridSize) * store.gridSize,
        y: Math.round(y / store.gridSize) * store.gridSize,
      };
    },
    [store.snapToGrid, store.gridSize],
  );

  // Save current state to undo stack before mutations
  const saveUndoState = useCallback(() => {
    store.pushUndoState(structuredClone(store.objects));
  }, [store]);

  // Add a new object to the canvas
  const addObject = useCallback(
    (type: LayoutObjectType, x: number, y: number, initial?: Partial<LayoutObject>): string => {
      const snapped = snapToGrid(x, y);
      const defaults = OBJECT_DEFAULTS[type];

      const newObject: LayoutObject = {
        id: generateId(),
        type,
        x: snapped.x,
        y: snapped.y,
        width: defaults.width ?? 60,
        height: defaults.height ?? 60,
        rotation: 0,
        locked: false,
        ...(type === "table" && {
          tableNumber: ++tableCounter,
          tableShape: defaults.tableShape ?? "rectangle",
          capacity: defaults.capacity ?? 4,
          chairLayout: "auto",
          chairDistribution: evenDistribution(defaults.capacity ?? 4, getTableSideCapacity({
            id: "tmp",
            type: "table",
            x: 0,
            y: 0,
            width: defaults.width ?? 60,
            height: defaults.height ?? 60,
            rotation: 0,
          })),
          label: `T${tableCounter}`,
        }),
        ...(type === "zone" && {
          zoneType: defaults.zoneType,
          color: defaults.color,
          opacity: defaults.opacity,
          label: defaults.zoneType ?? "dining",
        }),
        ...(type === "wall" && { thickness: defaults.thickness }),
        ...(type === "door" && { doorWidth: defaults.doorWidth }),
        ...(type === "cashier" && { label: "Cashier" }),
      };

      const finalObject: LayoutObject = {
        ...newObject,
        ...initial,
        id: newObject.id,
        type: newObject.type,
      };

      saveUndoState();
      const chairs = type === "table" ? generateChairsForTable(finalObject, finalObject.capacity ?? 4) : [];
      store.setObjects([...store.objects, finalObject, ...chairs]);
      store.setSelectedObjectId(finalObject.id);
      store.setIsDirty(true);
      // Switch back to select tool after placing
      store.setActiveTool("select");
      return finalObject.id;
    },
    [snapToGrid, saveUndoState, store],
  );

  // Update an existing object
  const updateObject = useCallback(
    (id: string, updates: Partial<LayoutObject>) => {
      const existing = store.objects.find((obj) => obj.id === id);
      if (!existing) return;

      let normalizedUpdates = updates;
      if (existing.type === "wall") {
        const fixedThickness = existing.thickness ?? existing.height;
        normalizedUpdates = {
          ...updates,
          height: fixedThickness,
          thickness: fixedThickness,
        };
      } else if (existing.type === "door") {
        const fixedDoorLength = existing.doorWidth ?? existing.width ?? DEFAULT_DOOR_LENGTH;
        normalizedUpdates = {
          ...updates,
          width: fixedDoorLength,
          doorWidth: fixedDoorLength,
          height: existing.height,
        };
      }

      saveUndoState();
      const updated = store.objects.map((obj) =>
        obj.id === id ? { ...obj, ...normalizedUpdates } : obj,
      );
      const final = existing.type === "wall"
        ? alignAttachedDoorsToWalls(updated, new Set([id]))
        : updated;
      store.setObjects(final);
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Move an object with snap-to-grid (also moves child objects like chairs)
  const moveObject = useCallback(
    (id: string, x: number, y: number, skipUndo = false) => {
      const snapped = snapToGrid(x, y);
      const orig = store.objects.find((o) => o.id === id);
      if (!orig || orig.locked) return;
      const dx = snapped.x - orig.x;
      const dy = snapped.y - orig.y;
      const updated = store.objects.map((obj) => {
        if (obj.id === id) return { ...obj, x: snapped.x, y: snapped.y };
        if (obj.parentId === id) return { ...obj, x: obj.x + dx, y: obj.y + dy };
        return obj;
      });
      if (!skipUndo && !isDraggingRef.current) {
        saveUndoState();
      }
      store.setObjects(updated);
      store.setIsDirty(true);
    },
    [snapToGrid, saveUndoState, store],
  );

  // Start drag (save undo once)
  const startDrag = useCallback(() => {
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      saveUndoState();
    }
  }, [saveUndoState]);

  // End drag
  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Resize an object (live; no undo per frame). For tables, chairs follow.
  const resizeObject = useCallback(
    (id: string, updates: { x: number; y: number; width: number; height: number }) => {
      const obj = store.objects.find((o) => o.id === id);
      if (!obj || obj.locked) return;
      const fixedWallThickness = obj.type === "wall" ? (obj.thickness ?? obj.height) : undefined;
      const applied = store.objects.map((o) => {
        if (o.id !== id) return o;
        if (o.type === "wall" && fixedWallThickness !== undefined) {
          return {
            ...o,
            ...updates,
            height: fixedWallThickness,
            thickness: fixedWallThickness,
          };
        }
        if (o.type === "door") {
          // Door size is fixed; resize interaction should not mutate dimensions.
          return o;
        }
        if (o.type !== "table") return { ...o, ...updates };
        return constrainTableState({ ...o, ...updates }, store.objects);
      });
      const next = obj.type === "table" ? rebuildChairs(applied, id) : applied;
      const final = obj.type === "wall"
        ? alignAttachedDoorsToWalls(next, new Set([id]))
        : next;
      store.setObjects(final);
      store.setIsDirty(true);
    },
    [store],
  );

  // Update table properties AND rebuild chairs (capacity / shape / size / position via inspector)
  const updateTableLayout = useCallback(
    (id: string, updates: Partial<LayoutObject>) => {
      const obj = store.objects.find((o) => o.id === id);
      if (!obj || obj.type !== "table") return;
      saveUndoState();
      const applied = store.objects.map((o) => {
        if (o.id !== id) return o;
        return constrainTableState({ ...o, ...updates }, store.objects);
      });
      const final = rebuildChairs(applied, id);
      store.setObjects(final);
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Assign a loose chair to a table (drag-drop). Increments table capacity.
  const assignChairToTable = useCallback(
    (chairId: string, tableId: string, preferredSide?: Exclude<TableChairLayout, "auto">) => {
      const table = store.objects.find((o) => o.id === tableId);
      if (!table || table.type !== "table") return;
      saveUndoState();
      const newCapacity = Math.min(computeMaxCapacity(table) + 1, (table.capacity ?? 4) + 1);
      const withoutLooseChair = store.objects.filter((o) => o.id !== chairId);
      const isRectTable = table.tableShape !== "circle";
      let nextDistribution: TableChairDistribution | undefined = table.chairDistribution;

      if (isRectTable) {
        const sideCapacity = getTableSideCapacity(table);
        const current = normalizeDistribution(
          table.chairDistribution ?? inferDistributionFromChildren(withoutLooseChair, tableId),
          table.capacity ?? 4,
          sideCapacity,
        );
        const draft = { ...current };

        if (preferredSide && draft[preferredSide] < sideCapacity[preferredSide]) {
          draft[preferredSide] += 1;
        } else {
          const order = preferredSide
            ? [preferredSide, ...CHAIR_LAYOUT_SIDES.filter((s) => s !== preferredSide)]
            : CHAIR_LAYOUT_SIDES;
          for (const side of order) {
            if (draft[side] < sideCapacity[side]) {
              draft[side] += 1;
              break;
            }
          }
        }

        nextDistribution = normalizeDistribution(draft, newCapacity, sideCapacity);
      }

      const withNewCap = withoutLooseChair.map((o) =>
        o.id === tableId
          ? {
              ...o,
              capacity: newCapacity,
              ...(preferredSide ? { chairLayout: preferredSide } : {}),
              ...(isRectTable ? { chairDistribution: nextDistribution } : {}),
            }
          : o,
      );
      const final = rebuildChairs(withNewCap, tableId);
      store.setObjects(final);
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Force table chair layout to a side, then rebuild all chairs.
  const setTableChairLayout = useCallback(
    (tableId: string, layout: TableChairLayout) => {
      const table = store.objects.find((o) => o.id === tableId);
      if (!table || table.type !== "table") return;
      saveUndoState();
      const maxCount = Math.min(table.capacity ?? 4, computeMaxCapacity(table));
      const sideCapacity = getTableSideCapacity(table);

      let nextDistribution: TableChairDistribution | undefined;
      if (table.tableShape !== "circle") {
        if (layout === "auto") {
          nextDistribution = evenDistribution(maxCount, sideCapacity);
        } else {
          const base: TableChairDistribution = { ...EMPTY_SIDE_DISTRIBUTION, [layout]: maxCount };
          nextDistribution = normalizeDistribution(base, maxCount, sideCapacity);
        }
      }

      const updated = store.objects.map((o) =>
        o.id === tableId
          ? {
              ...o,
              chairLayout: layout,
              ...(table.tableShape !== "circle" ? { chairDistribution: nextDistribution } : {}),
            }
          : o,
      );
      store.setObjects(rebuildChairs(updated, tableId));
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Move one existing chair from its current side to another side on the same table.
  const moveChairWithinTable = useCallback(
    (chairId: string, tableId: string, targetSide: ChairSide) => {
      const table = store.objects.find((o) => o.id === tableId);
      if (!table || table.type !== "table" || table.tableShape === "circle") return;

      const sourceSide = chairSideFromId(chairId);
      if (!sourceSide || sourceSide === targetSide) return;

      const sideCapacity = getTableSideCapacity(table);
      const current = normalizeDistribution(
        table.chairDistribution ?? inferDistributionFromChildren(store.objects, tableId),
        table.capacity ?? 4,
        sideCapacity,
      );

      if (current[sourceSide] <= 0 || current[targetSide] >= sideCapacity[targetSide]) return;

      saveUndoState();
      const next = { ...current };
      next[sourceSide] -= 1;
      next[targetSide] += 1;

      const updated = store.objects.map((o) =>
        o.id === tableId
          ? { ...o, chairLayout: "auto" as TableChairLayout, chairDistribution: next }
          : o,
      );

      store.setObjects(rebuildChairs(updated, tableId));
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Rotate an object
  const rotateObject = useCallback(
    (id: string, rotation: number) => {
      const target = store.objects.find((obj) => obj.id === id);
      if (!target || target.locked) return;

      const normalized = ((rotation % 360) + 360) % 360;
      const updated = store.objects.map((obj) =>
        obj.id === id ? { ...obj, rotation: normalized } : obj,
      );
      const final = target.type === "wall"
        ? alignAttachedDoorsToWalls(updated, new Set([id]))
        : updated;
      store.setObjects(final);
      store.setIsDirty(true);
    },
    [store],
  );

  // Add a wall segment created by drag-drawing
  const addWall = useCallback(
    (x: number, y: number, width: number, height: number, rotation: number, stayInWallTool = false) => {
      const newWall: LayoutObject = {
        id: generateId(),
        type: "wall",
        x,
        y,
        width,
        height,
        rotation,
        locked: false,
        thickness: height,
      };
      saveUndoState();
      store.setObjects([...store.objects, newWall]);
      store.setSelectedObjectId(newWall.id);
      store.setIsDirty(true);
      if (!stayInWallTool) {
        store.setActiveTool("select");
      }
    },
    [saveUndoState, store],
  );

  // Move connected wall corners by dragging a junction point.
  const moveWallCorners = useCallback(
    (updates: Array<{ wallId: string; endpoint: WallEndpointName; point: Point }>) => {
      if (updates.length === 0) return;

      const moveMap = new Map<string, { start?: Point; end?: Point }>();
      for (const update of updates) {
        const entry = moveMap.get(update.wallId) ?? {};
        if (update.endpoint === "start") entry.start = update.point;
        else entry.end = update.point;
        moveMap.set(update.wallId, entry);
      }

      const updated = store.objects.map((obj) => {
        if (obj.type !== "wall") return obj;
        const move = moveMap.get(obj.id);
        if (!move) return obj;

        const segment = wallSegmentFromObject(obj);
        const start = move.start ?? segment.start;
        const end = move.end ?? segment.end;
        const fixedThickness = obj.thickness ?? obj.height;
        const rect = wallRectFromEndpoints(start, end, fixedThickness);

        return {
          ...obj,
          ...rect,
          height: fixedThickness,
          thickness: fixedThickness,
        };
      });

      const changedWallIds = new Set(updates.map((u) => u.wallId));
      store.setObjects(alignAttachedDoorsToWalls(updated, changedWallIds));
      store.setIsDirty(true);
    },
    [store],
  );

  // Snap an existing door onto a wall segment and align its orientation/thickness.
  const attachDoorToWall = useCallback(
    (doorId: string, wallId: string, options?: { anchorPoint?: Point; skipUndo?: boolean }) => {
      const door = store.objects.find((o) => o.id === doorId);
      const wall = store.objects.find((o) => o.id === wallId);
      if (!door || door.type !== "door" || !wall || wall.type !== "wall") return;

      const wallSeg = wallSegmentFromObject(wall);
      const doorCenter = options?.anchorPoint ?? { x: door.x + door.width / 2, y: door.y + door.height / 2 };
      const snappedCenter = projectPointToSegment(doorCenter, wallSeg.start, wallSeg.end);
      const wallAngle = Math.atan2(wallSeg.end.y - wallSeg.start.y, wallSeg.end.x - wallSeg.start.x) * (180 / Math.PI);

      const wallThickness = wall.thickness ?? wall.height;
      const doorLength = door.doorWidth ?? door.width ?? DEFAULT_DOOR_LENGTH;
      const wallLength = Math.max(1, wall.width);
      const finalDoorLength = Math.min(doorLength, wallLength);

      if (!options?.skipUndo) {
        saveUndoState();
      }
      const updated = store.objects.map((o) =>
        o.id === doorId
          ? {
              ...o,
              x: snappedCenter.x - finalDoorLength / 2,
              y: snappedCenter.y - wallThickness / 2,
              width: finalDoorLength,
              height: wallThickness,
              thickness: wallThickness,
              doorWidth: finalDoorLength,
              rotation: ((wallAngle % 360) + 360) % 360,
              parentId: wallId,
            }
          : o,
      );

      store.setObjects(updated);
      store.setSelectedObjectId(doorId);
      store.setSelectedObjectIds([doorId]);
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Delete selected object(s) and their children
  const deleteSelected = useCallback(() => {
    const ids =
      store.selectedObjectIds.length > 0
        ? store.selectedObjectIds
        : store.selectedObjectId
          ? [store.selectedObjectId]
          : [];
    if (ids.length === 0) return;
    saveUndoState();
    const idSet = new Set(ids);

    const toDelete = store.objects.filter(
      (obj) => idSet.has(obj.id) || (obj.parentId && idSet.has(obj.parentId)),
    );
    const deletedTableIds = new Set(
      toDelete.filter((o) => o.type === "table").map((o) => o.id),
    );

    const removedChairByTable = new Map<
      string,
      { removed: number; bySide: Partial<Record<ChairSide, number>> }
    >();

    for (const obj of toDelete) {
      if (obj.type !== "chair" || !obj.parentId) continue;
      if (deletedTableIds.has(obj.parentId)) continue;

      const side = chairSideFromId(obj.id);
      const entry = removedChairByTable.get(obj.parentId) ?? {
        removed: 0,
        bySide: {},
      };
      entry.removed += 1;
      if (side) {
        entry.bySide[side] = (entry.bySide[side] ?? 0) + 1;
      }
      removedChairByTable.set(obj.parentId, entry);
    }

    const filtered = store.objects.filter(
      (obj) => !idSet.has(obj.id) && !(obj.parentId && idSet.has(obj.parentId)),
    );

    const finalObjects = filtered.map((obj) => {
      if (obj.type !== "table") return obj;

      const removedInfo = removedChairByTable.get(obj.id);
      if (!removedInfo) return obj;

      const oldCapacity = obj.capacity ?? 4;
      const newCapacity = Math.max(0, oldCapacity - removedInfo.removed);

      if (obj.tableShape === "circle") {
        return { ...obj, capacity: newCapacity };
      }

      const sideCapacity = getTableSideCapacity(obj);
      const currentDistribution = normalizeDistribution(
        obj.chairDistribution ?? inferDistributionFromChildren(store.objects, obj.id),
        oldCapacity,
        sideCapacity,
      );
      const nextDraft = { ...currentDistribution };

      for (const side of CHAIR_LAYOUT_SIDES) {
        const removedOnSide = removedInfo.bySide[side] ?? 0;
        if (removedOnSide > 0) {
          nextDraft[side] = Math.max(0, nextDraft[side] - removedOnSide);
        }
      }

      const nextDistribution = normalizeDistribution(nextDraft, newCapacity, sideCapacity);
      return {
        ...obj,
        capacity: newCapacity,
        chairDistribution: nextDistribution,
      };
    });

    store.setObjects(finalObjects);
    store.setSelectedObjectId(null);
    store.setSelectedObjectIds([]);
    store.setIsDirty(true);
  }, [saveUndoState, store]);

  // Duplicate selected object (+ children for tables)
  const duplicateSelected = useCallback(() => {
    const selected = store.objects.find((obj) => obj.id === store.selectedObjectId);
    if (!selected) return;
    saveUndoState();
    const newId = generateId();
    const duplicate: LayoutObject = {
      ...structuredClone(selected),
      id: newId,
      x: selected.x + store.gridSize,
      y: selected.y + store.gridSize,
      ...(selected.type === "table" && {
        tableNumber: ++tableCounter,
        label: `T${tableCounter}`,
      }),
    };
    const children = store.objects
      .filter((o) => o.parentId === selected.id)
      .map((o, i) => ({
        ...structuredClone(o),
        id: `${newId}_c_dup${i}`,
        parentId: newId,
        x: o.x + store.gridSize,
        y: o.y + store.gridSize,
      }));
    store.setObjects([...store.objects, duplicate, ...children]);
    store.setSelectedObjectId(duplicate.id);
    store.setIsDirty(true);
  }, [saveUndoState, store]);

  // Toggle lock on selected object
  const toggleLockSelected = useCallback(() => {
    if (!store.selectedObjectId) return;
    const obj = store.objects.find((o) => o.id === store.selectedObjectId);
    if (!obj) return;
    updateObject(store.selectedObjectId, { locked: !obj.locked });
  }, [store.selectedObjectId, store.objects, updateObject]);

  // Copy selected objects (+ their children) to clipboard
  const copy = useCallback(() => {
    const ids =
      store.selectedObjectIds.length > 0
        ? store.selectedObjectIds
        : store.selectedObjectId
          ? [store.selectedObjectId]
          : [];
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const toCopy = store.objects.filter(
      (o) => idSet.has(o.id) || (o.parentId && idSet.has(o.parentId)),
    );
    store.setClipboard(structuredClone(toCopy));
  }, [store]);

  // Paste clipboard contents with offset
  const paste = useCallback(() => {
    if (!store.clipboard || store.clipboard.length === 0) return;
    saveUndoState();
    const offset = store.gridSize * 2;
    const idMap = new Map<string, string>();
    for (const obj of store.clipboard) {
      idMap.set(obj.id, generateId());
    }
    const newObjects = store.clipboard.map((obj) => ({
      ...structuredClone(obj),
      id: idMap.get(obj.id) ?? generateId(),
      x: obj.x + offset,
      y: obj.y + offset,
      parentId: obj.parentId ? (idMap.get(obj.parentId) ?? undefined) : undefined,
      ...(obj.type === "table" && { tableNumber: ++tableCounter, label: `T${tableCounter}` }),
    }));
    store.setObjects([...store.objects, ...newObjects]);
    const topIds = newObjects.filter((o) => !o.parentId).map((o) => o.id);
    store.setSelectedObjectIds(topIds);
    store.setSelectedObjectId(topIds[0] ?? null);
    store.setIsDirty(true);
  }, [saveUndoState, store]);

  // Undo / Redo
  const undo = useCallback(() => {
    const prev = store.popUndo();
    if (!prev) return;
    store.setRedoStack([...useCanvasStore.getState().redoStack, structuredClone(store.objects)]);
    store.setObjects(prev);
    store.setIsDirty(true);
  }, [store]);

  const redo = useCallback(() => {
    const next = store.popRedo();
    if (!next) return;
    store.pushUndoState(structuredClone(store.objects));
    store.setObjects(next);
    store.setIsDirty(true);
  }, [store]);

  // Save layout data via API
  const saveLayout = useCallback(
    async (t: (key: string) => string) => {
      try {
        const layoutData = JSON.stringify(store.objects);
        await saveLayoutMutation.mutateAsync(layoutData);
        store.setIsDirty(false);
        toast.success(t("messages.saveSuccess"));
      } catch {
        toast.error(t("messages.saveError"));
      }
    },
    [store, saveLayoutMutation],
  );

  // Publish floor plan
  const publishLayout = useCallback(
    async (t: (key: string) => string) => {
      try {
        // Save first if dirty
        if (store.isDirty) {
          const layoutData = JSON.stringify(store.objects);
          await saveLayoutMutation.mutateAsync(layoutData);
        }
        await publishMutation.mutateAsync(floorPlanId);
        store.setIsDirty(false);
        toast.success(t("messages.publishSuccess"));
      } catch {
        toast.error(t("messages.publishError"));
      }
    },
    [store, saveLayoutMutation, publishMutation, floorPlanId],
  );

  // Load layout data from floor plan
  const loadLayout = useCallback(
    (layoutData: string | null, gridSize: number, snapToGridSetting: boolean, width: number, height: number) => {
      let objects: LayoutObject[] = [];
      if (layoutData) {
        try {
          objects = JSON.parse(layoutData) as LayoutObject[];
        } catch {
          objects = [];
        }
      }
      store.setObjects(objects);
      store.setGridSize(gridSize);
      store.setSnapToGrid(snapToGridSetting);
      store.setCanvasSize(width, height);
      store.setIsDirty(false);
      store.clearHistory();
      store.setSelectedObjectId(null);
      store.setActiveTool("select");
    },
    [store],
  );

  // Select all / deselect
  const selectAll = useCallback(() => {
    const ids = store.objects.map((o) => o.id);
    store.setSelectedObjectIds(ids);
    if (ids.length > 0) store.setSelectedObjectId(ids[0]);
  }, [store]);

  const deselectAll = useCallback(() => {
    store.setSelectedObjectId(null);
  }, [store]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === "c") {
        e.preventDefault();
        copy();
      } else if (isCtrl && e.key === "v") {
        e.preventDefault();
        paste();
      } else if (isCtrl && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        store.setActiveTool("select");
        store.setSelectedObjectId(null);
      }
    },
    [undo, redo, copy, paste, deleteSelected, duplicateSelected, store],
  );

  // Register keyboard shortcuts
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selectedObject = store.objects.find(
    (obj) => obj.id === store.selectedObjectId,
  );

  return {
    // State
    objects: store.objects,
    selectedObjectId: store.selectedObjectId,
    selectedObjectIds: store.selectedObjectIds,
    selectedObject,
    activeTool: store.activeTool,
    zoom: store.zoom,
    panOffset: store.panOffset,
    gridSize: store.gridSize,
    snapToGrid: store.snapToGrid,
    canvasWidth: store.canvasWidth,
    canvasHeight: store.canvasHeight,
    isDirty: store.isDirty,
    canUndo: store.undoStack.length > 0,
    canRedo: store.redoStack.length > 0,
    isSaving: saveLayoutMutation.isPending,
    isPublishing: publishMutation.isPending,

    // Tool selection
    setActiveTool: store.setActiveTool,
    setZoom: store.setZoom,
    setPanOffset: store.setPanOffset,
    setSelectedObjectId: store.setSelectedObjectId,
    setSelectedObjectIds: store.setSelectedObjectIds,
    setGridSize: store.setGridSize,
    setSnapToGrid: store.setSnapToGrid,

    // Object operations
    addObject,
    addWall,
    attachDoorToWall,
    moveWallCorners,
    updateObject,
    updateTableLayout,
    setTableChairLayout,
    assignChairToTable,
    moveChairWithinTable,
    moveObject,
    resizeObject,
    rotateObject,
    startDrag,
    endDrag,
    deleteSelected,
    duplicateSelected,
    toggleLockSelected,

    // Clipboard
    copy,
    paste,
    hasClipboard: !!store.clipboard,

    // Wall drawing state (auto-cleared on tool change)
    wallDrawing: store.wallDrawing,
    setWallDrawing: store.setWallDrawing,

    // History
    undo,
    redo,

    // Persistence
    saveLayout,
    publishLayout,
    loadLayout,

    // Selection
    selectAll,
    deselectAll,
  };
}
