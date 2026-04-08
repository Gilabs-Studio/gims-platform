"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageMotion } from "@/components/motion";

import { FloorLayoutList } from "./floor-layout-list";
import { FloorLayoutEditor } from "./floor-layout-editor";

export function FloorLayoutContainer() {
  const t = useTranslations("floorLayout");
  const [editorFloorPlanId, setEditorFloorPlanId] = useState<string | null>(null);

  const handleOpenEditor = useCallback((id: string) => {
    setEditorFloorPlanId(id);
  }, []);

  const handleBackToList = useCallback(() => {
    setEditorFloorPlanId(null);
  }, []);

  // Editor mode
  if (editorFloorPlanId) {
    return (
      <PageMotion>
        <div className="space-y-2">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="cursor-pointer mb-1"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            {t("title")}
          </Button>

          <FloorLayoutEditor
            floorPlanId={editorFloorPlanId}
            onBack={handleBackToList}
          />
        </div>
      </PageMotion>
    );
  }

  // List mode
  return (
    <PageMotion>
      <FloorLayoutList onOpenEditor={handleOpenEditor} />
    </PageMotion>
  );
}
