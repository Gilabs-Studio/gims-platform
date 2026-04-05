import { create } from "zustand";

import type { LayoutObject, LayoutObjectType } from "../types";

export interface WallDrawing {
  hasStart: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface CanvasState {
  // Object state
  objects: LayoutObject[];
  selectedObjectId: string | null;
  selectedObjectIds: string[];

  // Tool state
  activeTool: "select" | LayoutObjectType;

  // Viewport state
  zoom: number;
  panOffset: { x: number; y: number };

  // Grid settings
  gridSize: number;
  snapToGrid: boolean;
  canvasWidth: number;
  canvasHeight: number;

  // History (undo/redo)
  undoStack: LayoutObject[][];
  redoStack: LayoutObject[][];

  // Dirty flag
  isDirty: boolean;

  // Clipboard
  clipboard: LayoutObject[] | null;

  // Active wall drawing (cleared whenever tool changes)
  wallDrawing: WallDrawing | null;

  // Setters
  setObjects: (objects: LayoutObject[]) => void;
  setSelectedObjectId: (id: string | null) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  setActiveTool: (tool: "select" | LayoutObjectType) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setCanvasSize: (width: number, height: number) => void;
  setIsDirty: (dirty: boolean) => void;
  setClipboard: (objects: LayoutObject[] | null) => void;
  setWallDrawing: (state: WallDrawing | null) => void;

  // History setters
  pushUndoState: (objects: LayoutObject[]) => void;
  setRedoStack: (stack: LayoutObject[][]) => void;
  popUndo: () => LayoutObject[] | undefined;
  popRedo: () => LayoutObject[] | undefined;
  clearHistory: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  objects: [] as LayoutObject[],
  selectedObjectId: null as string | null,
  selectedObjectIds: [] as string[],
  activeTool: "select" as "select" | LayoutObjectType,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  gridSize: 20,
  snapToGrid: true,
  canvasWidth: 1200,
  canvasHeight: 800,
  undoStack: [] as LayoutObject[][],
  redoStack: [] as LayoutObject[][],
  isDirty: false,
  clipboard: null as LayoutObject[] | null,
  wallDrawing: null as WallDrawing | null,
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  ...initialState,

  setObjects: (objects) => set({ objects }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
  // Clear wall drawing whenever the active tool changes
  setActiveTool: (tool) => set({ activeTool: tool, wallDrawing: null }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setGridSize: (size) => set({ gridSize: size }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setClipboard: (objects) => set({ clipboard: objects }),
  setWallDrawing: (state) => set({ wallDrawing: state }),

  pushUndoState: (objects) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), objects],
      redoStack: [],
    })),

  setRedoStack: (stack) => set({ redoStack: stack }),

  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;
    const last = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1) });
    return last;
  },

  popRedo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;
    const last = redoStack[redoStack.length - 1];
    set({ redoStack: redoStack.slice(0, -1) });
    return last;
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  reset: () => set(initialState),
}));
