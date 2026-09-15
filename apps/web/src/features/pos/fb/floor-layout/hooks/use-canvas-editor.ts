import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import type { LayoutObject, LayoutObjectType } from "../types";
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

const DEFAULT_DOOR_LENGTH = OBJECT_DEFAULTS.door.width ?? 60;

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type WallEndpointName = "start" | "end";

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

export interface ClosestWallResult {
  wall: LayoutObject;
  snappedCenter: Point;
  wallAngle: number;
  wallThickness: number;
  distance: number;
}

export function findClosestWall(
  point: Point,
  walls: LayoutObject[],
  maxDistance = 35,
): ClosestWallResult | null {
  let closest: ClosestWallResult | null = null;
  let minDistance = maxDistance;

  for (const wall of walls) {
    if (wall.type !== "wall") continue;
    const seg = wallSegmentFromObject(wall);
    const proj = projectPointToSegment(point, seg.start, seg.end);
    const dist = Math.hypot(point.x - proj.x, point.y - proj.y);
    if (dist < minDistance) {
      minDistance = dist;
      const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x) * (180 / Math.PI);
      const thickness = wall.thickness ?? wall.height ?? 12;
      closest = {
        wall,
        snappedCenter: proj,
        wallAngle: ((angle % 360) + 360) % 360,
        wallThickness: thickness,
        distance: dist,
      };
    }
  }

  return closest;
}

function rectFromObject(obj: LayoutObject): Rect {
  return {
    x: obj.x,
    y: obj.y,
    width: Math.max(1, obj.width),
    height: Math.max(1, obj.height),
  };
}

function isRectInside(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function isRectOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function boundsOfObjects(objects: LayoutObject[]): Rect {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const obj of objects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
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
      useCanvasStore.setState((s) => ({
        objects: [...s.objects, finalObject],
        selectedObjectId: finalObject.id,
        selectedObjectIds: [finalObject.id],
        isDirty: true,
        activeTool: "select",
      }));
      return finalObject.id;
    },
    [snapToGrid, saveUndoState],
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

  // Move multiple objects atomically (for multi-selection drag)
  const moveObjects = useCallback(
    (
      moves: Array<{ id: string; x: number; y: number }>,
      skipUndo = false,
      applySnap = false,
    ) => {
      if (moves.length === 0) return;
      const moveMap = new Map<string, { x: number; y: number }>();
      for (const m of moves) {
        const pos = applySnap ? snapToGrid(m.x, m.y) : { x: m.x, y: m.y };
        moveMap.set(m.id, pos);
      }

      if (!skipUndo && !isDraggingRef.current) {
        saveUndoState();
      }

      useCanvasStore.setState((state) => {
        const updated = state.objects.map((obj) => {
          const move = moveMap.get(obj.id);
          if (move) {
            return { ...obj, x: move.x, y: move.y };
          }
          if (obj.parentId && moveMap.has(obj.parentId)) {
            const parentMove = moveMap.get(obj.parentId)!;
            const parentOrig = state.objects.find((o) => o.id === obj.parentId);
            if (parentOrig) {
              const dx = parentMove.x - parentOrig.x;
              const dy = parentMove.y - parentOrig.y;
              return { ...obj, x: obj.x + dx, y: obj.y + dy };
            }
          }
          return obj;
        });

        const movedWallIds = new Set(
          state.objects
            .filter((o) => o.type === "wall" && moveMap.has(o.id))
            .map((o) => o.id),
        );
        const final = movedWallIds.size > 0
          ? alignAttachedDoorsToWalls(updated, movedWallIds)
          : updated;

        return { objects: final, isDirty: true };
      });
    },
    [snapToGrid, saveUndoState],
  );

  // Move a single object with snap-to-grid
  const moveObject = useCallback(
    (id: string, x: number, y: number, skipUndo = false) => {
      moveObjects([{ id, x, y }], skipUndo, true);
    },
    [moveObjects],
  );

  // Move door with real-time snap and orientation adjustment
  const moveDoorWithSnap = useCallback(
    (
      doorId: string,
      snap: {
        x: number;
        y: number;
        rotation: number;
        isSnappedToWall: boolean;
        snappedWallId: string | null;
      },
    ) => {
      useCanvasStore.setState((state) => {
        const updated = state.objects.map((obj) => {
          if (obj.id !== doorId) return obj;
          if (snap.isSnappedToWall && snap.snappedWallId) {
            return {
              ...obj,
              x: snap.x,
              y: snap.y,
              rotation: snap.rotation,
              parentId: snap.snappedWallId,
            };
          }
          return {
            ...obj,
            x: snap.x,
            y: snap.y,
            parentId: undefined,
          };
        });
        return { objects: updated, isDirty: true };
      });
    },
    [],
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

  // Resize an object (live; no undo per frame).
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
          const doorThickness = o.thickness ?? o.height ?? 12;
          const newWidth = Math.max(20, updates.width);
          return {
            ...o,
            ...updates,
            width: newWidth,
            doorWidth: newWidth,
            height: doorThickness,
            thickness: doorThickness,
          };
        }
        return { ...o, ...updates };
      });
      const final = obj.type === "wall"
        ? alignAttachedDoorsToWalls(applied, new Set([id]))
        : applied;
      store.setObjects(final);
      store.setIsDirty(true);
    },
    [store],
  );

  // Update table properties (capacity / shape / size / position via inspector)
  const updateTableLayout = useCallback(
    (id: string, updates: Partial<LayoutObject>) => {
      const obj = store.objects.find((o) => o.id === id);
      if (!obj || obj.type !== "table") return;
      saveUndoState();
      const applied = store.objects.map((o) => {
        if (o.id !== id) return o;
        return { ...o, ...updates };
      });
      store.setObjects(applied);
      store.setIsDirty(true);
    },
    [saveUndoState, store],
  );

  // Deprecated chair stubs kept for backwards compatibility
  const assignChairToTable = useCallback(() => {}, []);
  const setTableChairLayout = useCallback(() => {}, []);
  const moveChairWithinTable = useCallback(() => {}, []);

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
      const currentState = useCanvasStore.getState();
      const door = currentState.objects.find((o) => o.id === doorId);
      const wall = currentState.objects.find((o) => o.id === wallId);
      if (!door || door.type !== "door" || !wall || wall.type !== "wall") return;

      const wallSeg = wallSegmentFromObject(wall);
      const doorCenter = options?.anchorPoint ?? { x: door.x + door.width / 2, y: door.y + door.height / 2 };
      const snappedCenter = projectPointToSegment(doorCenter, wallSeg.start, wallSeg.end);
      const wallAngle = Math.atan2(wallSeg.end.y - wallSeg.start.y, wallSeg.end.x - wallSeg.start.x) * (180 / Math.PI);

      const isVertical = wall.height > wall.width;
      const wallThickness = isVertical ? wall.width : (wall.thickness ?? wall.height ?? 12);
      const doorLength = door.doorWidth ?? door.width ?? DEFAULT_DOOR_LENGTH;
      const wallLength = isVertical ? wall.height : Math.max(1, wall.width);
      const finalDoorLength = Math.min(doorLength, wallLength);

      if (!options?.skipUndo) {
        saveUndoState();
      }

      useCanvasStore.setState((s) => ({
        objects: s.objects.map((o) =>
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
        ),
        selectedObjectId: doorId,
        selectedObjectIds: [doorId],
        isDirty: true,
      }));
    },
    [saveUndoState],
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

    const filtered = store.objects.filter(
      (obj) => !idSet.has(obj.id) && !(obj.parentId && idSet.has(obj.parentId)),
    );

    store.setObjects(filtered);
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
    const includeSet = new Set(ids);

    // If a zone is selected, include all objects fully inside that zone as one room group.
    const selectedZones = store.objects.filter(
      (o) => includeSet.has(o.id) && o.type === "zone",
    );
    if (selectedZones.length > 0) {
      for (const zone of selectedZones) {
        const zoneRect = rectFromObject(zone);
        for (const obj of store.objects) {
          if (includeSet.has(obj.id)) continue;
          if (obj.parentId && includeSet.has(obj.parentId)) continue;
          if (isRectInside(zoneRect, rectFromObject(obj))) {
            includeSet.add(obj.id);
          }
        }
      }
    }

    // Expand descendants recursively to keep parent-child integrity.
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const obj of store.objects) {
        if (!obj.parentId) continue;
        if (includeSet.has(obj.parentId) && !includeSet.has(obj.id)) {
          includeSet.add(obj.id);
          expanded = true;
        }
      }
    }

    const toCopy = store.objects.filter((o) => includeSet.has(o.id));
    store.setClipboard(structuredClone(toCopy));
  }, [store]);

  // Paste clipboard contents with offset
  const paste = useCallback(() => {
    if (!store.clipboard || store.clipboard.length === 0) return;
    saveUndoState();
    const clipBounds = boundsOfObjects(store.clipboard);
    const stepX = Math.max(store.gridSize * 2, clipBounds.width + store.gridSize);
    let offsetX = stepX;
    let offsetY = 0;

    // Push pasted group to the right side until it no longer overlaps existing objects.
    for (let i = 0; i < 24; i++) {
      const wouldOverlap = store.clipboard.some((clipObj) => {
        const movedRect = {
          x: clipObj.x + offsetX,
          y: clipObj.y + offsetY,
          width: Math.max(1, clipObj.width),
          height: Math.max(1, clipObj.height),
        };
        return store.objects.some((existing) => isRectOverlap(movedRect, rectFromObject(existing)));
      });

      if (!wouldOverlap) break;

      offsetX += stepX;
      if (offsetX > store.canvasWidth * 2) {
        offsetX = stepX;
        offsetY += Math.max(store.gridSize * 2, clipBounds.height + store.gridSize);
      }
    }

    const idMap = new Map<string, string>();
    for (const obj of store.clipboard) {
      idMap.set(obj.id, generateId());
    }
    const newObjects = store.clipboard.map((obj) => ({
      ...structuredClone(obj),
      id: idMap.get(obj.id) ?? generateId(),
      x: obj.x + offsetX,
      y: obj.y + offsetY,
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

  // Save layout data and publish in one consolidated action
  const saveAndPublishLayout = useCallback(
    async (t: (key: string) => string) => {
      try {
        const layoutData = JSON.stringify(store.objects);
        await saveLayoutMutation.mutateAsync(layoutData);
        await publishMutation.mutateAsync(floorPlanId);
        store.setIsDirty(false);
        toast.success(t("messages.saveSuccess"));
      } catch {
        toast.error(t("messages.saveError"));
      }
    },
    [store, saveLayoutMutation, publishMutation, floorPlanId],
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

      // Sanitize: strip legacy chairs and preserve seat count as table capacity
      const chairCounts = new Map<string, number>();
      let hasChairs = false;
      for (const obj of objects) {
        if (obj.type === "chair") {
          hasChairs = true;
          if (obj.parentId) {
            chairCounts.set(obj.parentId, (chairCounts.get(obj.parentId) ?? 0) + 1);
          }
        }
      }
      if (hasChairs) {
        objects = objects
          .filter((obj) => obj.type !== "chair")
          .map((obj) => {
            if (obj.type === "table") {
              const chairs = chairCounts.get(obj.id) ?? 0;
              const cap = Math.max(obj.capacity ?? 0, chairs, 1);
              return { ...obj, capacity: cap };
            }
            return obj;
          });
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

  const resetZoom = useCallback(() => {
    store.setZoom(1);
    store.setPanOffset({ x: 0, y: 0 });
  }, [store]);

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
    isSaving: saveLayoutMutation.isPending || publishMutation.isPending,
    isPublishing: publishMutation.isPending,

    // Tool selection
    setActiveTool: store.setActiveTool,
    setZoom: store.setZoom,
    resetZoom,
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
    moveObjects,
    moveDoorWithSnap,
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
    saveAndPublishLayout,
    publishLayout,
    loadLayout,

    // Selection
    selectAll,
    deselectAll,
  };
}
