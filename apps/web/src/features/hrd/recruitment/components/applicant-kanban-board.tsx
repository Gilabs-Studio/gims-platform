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
import { useProgressiveApplicantKanban, useMoveApplicantStage } from "../hooks/use-applicants";
import { ApplicantCard } from "./applicant-card";
import { MoveStageDialog } from "./move-stage-dialog";
import type { RecruitmentApplicant, ApplicantStage } from "../types";

interface ApplicantKanbanBoardProps {
  recruitmentRequestId: string;
  onApplicantClick: (applicant: RecruitmentApplicant) => void;
  onCreateApplicant: (stageId?: string) => void;
}

function KanbanColumnSkeleton() {
  return (
    <div className="w-72 shrink-0 rounded-lg border bg-muted/30 p-3 space-y-3">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

/** Draggable wrapper for a single applicant card */
function DraggableApplicantCard({
  applicant,
  onClick,
}: {
  applicant: RecruitmentApplicant;
  onClick: (applicant: RecruitmentApplicant) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: applicant.id,
    data: { applicant },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
    >
      <ApplicantCard applicant={applicant} onClick={onClick} />
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
      className={`flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-320px)] rounded-lg transition-colors ${
        isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function ApplicantKanbanBoard({
  recruitmentRequestId,
  onApplicantClick,
  onCreateApplicant,
}: ApplicantKanbanBoardProps) {
  const t = useTranslations("recruitment");
  const {
    stages,
    applicantsByStage,
    isLoading,
    hasMoreForStage,
    isLoadingMoreForStage,
    fetchNextPageForStage,
    resetExtraPages,
  } = useProgressiveApplicantKanban({ recruitmentRequestId });

  const moveStageMutation = useMoveApplicantStage();

  const [activeApplicant, setActiveApplicant] = useState<RecruitmentApplicant | null>(null);
  const [moveDialog, setMoveDialog] = useState<{
    applicant: RecruitmentApplicant;
    targetStageId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const applicant = event.active.data.current?.applicant as RecruitmentApplicant | undefined;
    if (applicant) setActiveApplicant(applicant);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveApplicant(null);
      const { active, over } = event;
      if (!over) return;

      const applicant = active.data.current?.applicant as RecruitmentApplicant | undefined;
      const targetStageId = over.id as string;
      if (!applicant) return;

      // Don't open dialog if dropped on the same stage
      if (applicant.stage_id === targetStageId) return;

      setMoveDialog({ applicant, targetStageId });
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
        {t("applicants.noStages")}
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
          {stages.map((stage: ApplicantStage) => {
            const stageData = applicantsByStage[stage.id];
            const applicants = stageData?.applicants ?? [];
            const total = stageData?.total ?? 0;

            return (
              <div
                key={stage.id}
                className="w-72 shrink-0 flex flex-col rounded-lg border bg-muted/30"
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
                    onClick={() => onCreateApplicant(stage.id)}
                    title={t("applicants.add")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Droppable applicants area */}
                <DroppableColumn stageId={stage.id}>
                  {applicants.length === 0 && (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      {t("applicants.empty")}
                    </p>
                  )}

                  {applicants.map((applicant) => (
                    <DraggableApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      onClick={onApplicantClick}
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
          {activeApplicant ? (
            <div className="rotate-2 opacity-90 w-64">
              <ApplicantCard applicant={activeApplicant} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Move stage dialog */}
      <MoveStageDialog
        applicant={moveDialog?.applicant ?? null}
        open={!!moveDialog}
        defaultTargetStageId={moveDialog?.targetStageId}
        stages={stages}
        onOpenChange={(open) => {
          if (!open) setMoveDialog(null);
        }}
        onSuccess={() => {
          setMoveDialog(null);
          resetExtraPages();
        }}
      />
    </>
  );
}
