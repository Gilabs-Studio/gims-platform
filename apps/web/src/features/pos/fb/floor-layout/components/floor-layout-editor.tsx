"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

import { useFloorLayout } from "../hooks/use-floor-layouts";
import { useCanvasEditor } from "../hooks/use-canvas-editor";
import { LayoutPalette } from "./layout-palette";
import { FloorCanvas } from "./floor-canvas";
import { ObjectInspector } from "./object-inspector";
import { LayoutToolbar } from "./layout-toolbar";
import { PublishDialog } from "./publish-dialog";
import { VersionHistoryPanel } from "./version-history-panel";

interface FloorLayoutEditorProps {
  readonly floorPlanId: string;
  readonly onBack: () => void;
}

export function FloorLayoutEditor({ floorPlanId, onBack }: FloorLayoutEditorProps) {
  const t = useTranslations("floorLayout");
  const { data, isPending, isError } = useFloorLayout(floorPlanId);
  const floorPlan = data?.data;
  const editor = useCanvasEditor(floorPlanId);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // Load layout data when floor plan is fetched
  useEffect(() => {
    if (floorPlan) {
      editor.loadLayout(
        floorPlan.layout_data,
        floorPlan.grid_size,
        floorPlan.snap_to_grid,
        floorPlan.width,
        floorPlan.height,
      );
    }
  }, [floorPlan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editor.isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor.isDirty]);

  const handlePublish = async () => {
    await editor.publishLayout(t);
    setShowPublishDialog(false);
  };

  if (isPending) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <div className="flex-1 flex gap-2">
          <Skeleton className="w-20 h-full" />
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-56 h-full" />
        </div>
      </div>
    );
  }

  if (isError || !floorPlan) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">Floor plan not found</p>
          <button onClick={onBack} className="text-primary text-sm mt-2 cursor-pointer hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden rounded-lg border bg-background">
      {/* Top toolbar */}
      <LayoutToolbar
        editor={editor}
        floorPlanName={floorPlan.name}
        status={floorPlan.status}
        onPublish={() => setShowPublishDialog(true)}
        onShowVersions={() => setShowVersions(true)}
      />

      {/* Main editor area: Palette | Canvas | Inspector */}
      <div className="flex-1 flex overflow-hidden">
        <LayoutPalette editor={editor} />
        <FloorCanvas editor={editor} />
        <ObjectInspector editor={editor} />
      </div>

      {/* Publish dialog */}
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onConfirm={handlePublish}
        isPending={editor.isPublishing}
      />

      {/* Version history */}
      <VersionHistoryPanel
        open={showVersions}
        onOpenChange={setShowVersions}
        floorPlanId={floorPlanId}
      />
    </div>
  );
}
