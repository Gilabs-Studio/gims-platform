"use client";

import { useTranslations } from "next-intl";
import { HistoryIcon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useFloorLayoutVersions } from "../hooks/use-floor-layouts";

interface VersionHistoryPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly floorPlanId: string;
}

export function VersionHistoryPanel({
  open,
  onOpenChange,
  floorPlanId,
}: VersionHistoryPanelProps) {
  const t = useTranslations("floorLayout.versions");
  const { data, isPending } = useFloorLayoutVersions(floorPlanId, {
    enabled: open && !!floorPlanId,
  });
  const versions = data?.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            {t("title")}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          {isPending && (
            <div className="space-y-3 p-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isPending && versions.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t("noVersions")}
            </div>
          )}

          {!isPending && versions.length > 0 && (
            <div className="space-y-2 p-1">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {t("version")} {version.version}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("publishedAt")}:{" "}
                    {version.published_at
                      ? new Date(version.published_at).toLocaleString()
                      : "-"}
                  </p>
                  {version.published_by && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("publishedBy")}: {version.published_by}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
