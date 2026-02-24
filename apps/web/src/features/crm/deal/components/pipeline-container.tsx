"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMotion } from "@/components/motion";
import { useRouter } from "@/i18n/routing";
import { KanbanBoard } from "./kanban-board";
import { DealFormDialog } from "./deal-form-dialog";
import { PipelineSummary } from "./pipeline-summary";
import type { Deal } from "../types";

export function PipelineContainer() {
  const t = useTranslations("crmDeal");
  const router = useRouter();

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);

  // Selected deal for form dialog
  const [editDeal, setEditDeal] = useState<Deal | null>(null);

  // Pre-selected stage when creating from a column
  const [createStageId, setCreateStageId] = useState<string | undefined>();

  const handleCreateDeal = useCallback((stageId?: string) => {
    setEditDeal(null);
    setCreateStageId(stageId);
    setFormOpen(true);
  }, []);

  const handleViewDetail = useCallback((deal: Deal) => {
    router.push(`/crm/pipeline/${deal.id}`);
  }, [router]);

  const handleFormSuccess = useCallback(() => {
    toast.success(t("created"));
  }, [t]);

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          </div>
          <Button
            className="cursor-pointer"
            onClick={() => handleCreateDeal()}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("addDeal")}
          </Button>
        </div>

        {/* Tabs: Kanban / Summary */}
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban" className="cursor-pointer">
              {t("kanbanTitle")}
            </TabsTrigger>
            <TabsTrigger value="summary" className="cursor-pointer">
              {t("summaryTitle")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <KanbanBoard
              onDealClick={handleViewDetail}
              onCreateDeal={handleCreateDeal}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <PipelineSummary />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Deal Form */}
      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editDeal}
        defaultStageId={createStageId}
        onSuccess={handleFormSuccess}
      />
    </PageMotion>
  );
}
