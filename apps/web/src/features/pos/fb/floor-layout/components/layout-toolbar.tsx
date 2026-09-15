"use client";

import {
  SaveIcon,
  Undo2Icon,
  Redo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize2Icon,
  Trash2Icon,
  CopyIcon,
  LockIcon,
  UnlockIcon,
  GridIcon,
  HistoryIcon,
  ArrowLeft,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { useCanvasEditor } from "../hooks/use-canvas-editor";

type CanvasEditorReturn = ReturnType<typeof useCanvasEditor>;

interface LayoutToolbarProps {
  readonly editor: CanvasEditorReturn;
  readonly floorPlanName: string;
  readonly status?: string;
  readonly onBack?: () => void;
  readonly onShowVersions: () => void;
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  variant = "ghost",
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: "ghost" | "default" | "destructive" | "outline";
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={onClick}
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LayoutToolbar({
  editor,
  floorPlanName,
  onBack,
  onShowVersions,
}: LayoutToolbarProps) {
  const t = useTranslations("floorLayout");

  return (
    <div className="h-12 bg-background border-b flex items-center justify-between px-3 shrink-0">
      {/* Left: Back button + Floor plan name */}
      <div className="flex items-center gap-1.5">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full cursor-pointer mr-0.5"
            onClick={onBack}
            title={t("title")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-sm font-semibold truncate max-w-48">{floorPlanName}</h2>
        {editor.isDirty && (
          <span className="text-[10px] text-amber-600 font-medium ml-1">Unsaved</span>
        )}
      </div>

      {/* Center: Edit actions */}
      <div className="flex items-center gap-0.5">
        {/* Undo/Redo */}
        <ToolbarButton
          icon={<Undo2Icon className="h-4 w-4" />}
          label={`${t("editor.undo")} (Ctrl+Z)`}
          onClick={editor.undo}
          disabled={!editor.canUndo}
        />
        <ToolbarButton
          icon={<Redo2Icon className="h-4 w-4" />}
          label={`${t("editor.redo")} (Ctrl+Y)`}
          onClick={editor.redo}
          disabled={!editor.canRedo}
        />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Object actions */}
        <ToolbarButton
          icon={<CopyIcon className="h-4 w-4" />}
          label={`${t("editor.duplicateSelected")} (Ctrl+D)`}
          onClick={editor.duplicateSelected}
          disabled={!editor.selectedObjectId}
        />
        <ToolbarButton
          icon={<Trash2Icon className="h-4 w-4" />}
          label={`${t("editor.deleteSelected")} (Del)`}
          onClick={editor.deleteSelected}
          disabled={!editor.selectedObjectId}
          variant={editor.selectedObjectId ? "destructive" : "ghost"}
        />
        <ToolbarButton
          icon={
            editor.selectedObject?.locked ? (
              <UnlockIcon className="h-4 w-4" />
            ) : (
              <LockIcon className="h-4 w-4" />
            )
          }
          label={editor.selectedObject?.locked ? t("editor.unlockSelected") : t("editor.lockSelected")}
          onClick={editor.toggleLockSelected}
          disabled={!editor.selectedObjectId}
        />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Zoom */}
        <ToolbarButton
          icon={<ZoomOutIcon className="h-4 w-4" />}
          label={t("editor.zoomOut")}
          onClick={() => editor.setZoom(editor.zoom - 0.1)}
          disabled={editor.zoom <= 0.25}
        />
        <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
          {Math.round(editor.zoom * 100)}%
        </span>
        <ToolbarButton
          icon={<ZoomInIcon className="h-4 w-4" />}
          label={t("editor.zoomIn")}
          onClick={() => editor.setZoom(editor.zoom + 0.1)}
          disabled={editor.zoom >= 3}
        />
        <ToolbarButton
          icon={<Maximize2Icon className="h-4 w-4" />}
          label={t("editor.zoomReset")}
          onClick={() => {
            editor.setZoom(1);
            editor.setPanOffset({ x: 0, y: 0 });
          }}
        />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Grid toggle */}
        <div className="flex items-center gap-1.5">
          <GridIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <Switch
            checked={editor.snapToGrid}
            onCheckedChange={editor.setSnapToGrid}
            className="cursor-pointer scale-75"
          />
        </div>
      </div>

      {/* Right: Versions + Save */}
      <div className="flex items-center gap-1.5">
        <ToolbarButton
          icon={<HistoryIcon className="h-4 w-4" />}
          label={t("viewVersions")}
          onClick={onShowVersions}
        />
        <Button
          size="sm"
          className="h-8 text-xs cursor-pointer"
          onClick={() => editor.saveAndPublishLayout(t)}
          disabled={editor.isSaving}
        >
          <SaveIcon className="h-3.5 w-3.5 mr-1" />
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
