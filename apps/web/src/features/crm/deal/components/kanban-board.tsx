"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StageScrollLoader } from "@/components/ui/stage-scroll-loader";
import { useProgressiveKanbanBoard } from "../hooks/use-progressive-kanban";
import { DealCard } from "./deal-card";
import { MoveStageDialog } from "./move-stage-dialog";
import type { Deal } from "../types";

interface KanbanBoardProps {
  onDealClick: (deal: Deal) => void;
  onCreateDeal: (stageId?: string) => void;
}

function KanbanColumnSkeleton() {
  return (
    <div className="w-80 shrink-0 rounded-lg border bg-muted/30 p-3 space-y-3">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

/** Draggable wrapper for a single deal card */
function DraggableDealCard({
  deal,
  onClick,
}: {
  deal: Deal;
  onClick: (deal: Deal) => void;
}) {
  // Deals already converted to a quotation cannot be moved
  const isLocked = !!deal.converted_to_quotation_id;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
    disabled: isLocked,
  });

  return (
    <div
      ref={setNodeRef}
      {...(isLocked ? {} : listeners)}
      {...(isLocked ? {} : attributes)}
      style={{
        opacity: isDragging ? 0.4 : 1,
        touchAction: isLocked ? "auto" : "none",
        cursor: isLocked ? "default" : undefined,
      }}
    >
      <DealCard deal={deal} onClick={onClick} />
    </div>
  );
}

/** Droppable column wrapper */
function DroppableColumn({
  stageId,
  children,
}: {
  stageId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)] rounded-lg transition-colors ${
        isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function KanbanBoard({ onDealClick, onCreateDeal }: KanbanBoardProps) {
  const t = useTranslations("crmDeal");
  const {
    stages,
    dealsByStage,
    isLoading,
    hasMoreForStage,
    isLoadingMoreForStage,
    fetchNextPageForStage,
    resetExtraPages,
  } = useProgressiveKanbanBoard();

  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [moveDialog, setMoveDialog] = useState<{
    deal: Deal;
    targetStageId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const deal = event.active.data.current?.deal as Deal | undefined;
    if (deal) setActiveDeal(deal);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDeal(null);
      const { active, over } = event;
      if (!over) return;

      const deal = active.data.current?.deal as Deal | undefined;
      const targetStageId = over.id as string;
      if (!deal) return;

      // Don't open dialog if dropped on the same stage
      if (deal.pipeline_stage_id === targetStageId) return;

      setMoveDialog({ deal, targetStageId });
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <KanbanColumnSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t("noPipelineStages")}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageData = dealsByStage[stage.id];
            const deals = stageData?.deals ?? [];
            const total = stageData?.total ?? 0;

            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 flex flex-col rounded-lg border bg-muted/30"
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color || "var(--color-muted-foreground)" }}
                    />
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {stage.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {total}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={() => onCreateDeal(stage.id)}
                    title={t("createDeal")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Droppable deals area */}
                <DroppableColumn stageId={stage.id}>
                  {deals.length === 0 && (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      {t("noDeals")}
                    </p>
                  )}

                  {deals.map((deal) => (
                    <DraggableDealCard
                      key={deal.id}
                      deal={deal}
                      onClick={onDealClick}
                    />
                  ))}

                  <StageScrollLoader
                    onLoadMore={() => fetchNextPageForStage(stage.id)}
                    hasMore={hasMoreForStage(stage.id)}
                    isLoading={isLoadingMoreForStage(stage.id)}
                  />
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        {/* Ghost card shown while dragging */}
        <DragOverlay>
          {activeDeal ? (
            <div className="rotate-2 opacity-90 w-72">
              <DealCard deal={activeDeal} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Move stage dialog — pre-filled with the drop target stage */}
      <MoveStageDialog
        deal={moveDialog?.deal ?? null}
        open={!!moveDialog}
        defaultTargetStageId={moveDialog?.targetStageId}
        onOpenChange={(open) => {
          if (!open) setMoveDialog(null);
        }}
        onSuccess={() => {
          setMoveDialog(null);
          // Only reset progressive loading state here — the mutation's
          // onSuccess already handles targeted query invalidation.
          // Calling invalidateAll() would trigger a second full refetch.
          resetExtraPages();
        }}
      />
    </>
  );
}
