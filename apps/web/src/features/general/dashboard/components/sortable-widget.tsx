"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WidgetConfig, WidgetSize } from "../types";

// Grid column-span per size. grid-flow-dense on the parent fills gaps automatically.
const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 sm:col-span-2",
  lg: "col-span-1 sm:col-span-2 lg:col-span-3",
  xl: "col-span-1 sm:col-span-2 lg:col-span-4",
};

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = {
  sm: "md",
  md: "lg",
  lg: "xl",
  xl: "sm",
};

interface SortableWidgetProps {
  readonly widget: WidgetConfig;
  readonly isEditMode: boolean;
  readonly onRemove: (id: string) => void;
  readonly onResize: (id: string, size: WidgetSize) => void;
  readonly children: React.ReactNode;
}

export function SortableWidget({
  widget,
  isEditMode,
  onRemove,
  onResize,
  children,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${SIZE_CLASSES[widget.size]} ${
        isEditMode ? "rounded-lg ring-2 ring-dashed ring-primary/30" : ""
      }`}
    >
      {isEditMode && !isDragging && (
        <div className="absolute -top-4 right-0 z-10 flex items-center gap-0.5">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 cursor-grab rounded-full shadow-sm active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 cursor-pointer rounded-full shadow-sm"
            onClick={() => onResize(widget.id, NEXT_SIZE[widget.size])}
          >
            {widget.size === "xl" ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 cursor-pointer rounded-full shadow-sm"
            onClick={() => onRemove(widget.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
