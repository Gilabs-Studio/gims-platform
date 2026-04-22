"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, Store, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageMotion } from "@/components/motion";
import { useOutlets } from "@/features/master-data/outlet/hooks/use-outlets";
import { Link } from "@/i18n/routing";
import { useFloorLayouts } from "../hooks/use-floor-layouts";

import { FloorLayoutList } from "./floor-layout-list";
import { FloorLayoutEditor } from "./floor-layout-editor";
import { CreateFloorPlanDialog } from "./create-floor-plan-dialog";

export function FloorLayoutContainer() {
  const t = useTranslations("floorLayout");
  const [editorFloorPlanId, setEditorFloorPlanId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [autoCreateOutletId, setAutoCreateOutletId] = useState<string | null>(null);
  const hasAutoNavigated = useRef(false);

  // Fetch user's assigned outlets
  const { data: outletsData, isLoading: outletsLoading } = useOutlets({ 
    is_active: true, 
    per_page: 50 
  });
  const assignedOutlets = useMemo(() => outletsData?.data ?? [], [outletsData?.data]);
  const companyId = useMemo(() => {
    const uniqueCompanyIDs = Array.from(
      new Set(
        assignedOutlets
          .map((outlet) => outlet.company_id)
          .filter((id): id is string => !!id)
      )
    );
    return uniqueCompanyIDs.length === 1 ? uniqueCompanyIDs[0] : undefined;
  }, [assignedOutlets]);

  // Fetch existing floor layouts
  const { data: layoutsData, isLoading: layoutsLoading } = useFloorLayouts(
    { per_page: 100, company_id: companyId },
    { enabled: assignedOutlets.length > 0 }
  );
  const existingLayouts = useMemo(() => layoutsData?.data ?? [], [layoutsData?.data]);

  const handleOpenEditor = useCallback((id: string) => {
    setEditorFloorPlanId(id);
  }, []);

  const handleBackToList = useCallback(() => {
    setEditorFloorPlanId(null);
  }, []);

  const handleCreateSuccess = useCallback((id: string) => {
    setShowCreateDialog(false);
    setAutoCreateOutletId(null);
    setEditorFloorPlanId(id);
  }, []);

  // Auto-navigate for single outlet:
  // If user has only 1 outlet, and it has a floor plan, open it directly in edit mode
  // If user has only 1 outlet but no floor plan, open create dialog
  useEffect(() => {
    if (hasAutoNavigated.current) return;
    if (outletsLoading || layoutsLoading) return;
    if (assignedOutlets.length !== 1) return;

    hasAutoNavigated.current = true;
    const singleOutlet = assignedOutlets[0];
    
    // Find existing floor layout for this outlet
    const existingLayout = existingLayouts.find((layout) => layout.outlet_id === singleOutlet.id);
    
    if (existingLayout) {
      // Open existing layout directly in editor
      queueMicrotask(() => {
        setEditorFloorPlanId(existingLayout.id);
      });
    } else {
      // No layout exists - show create dialog with outlet pre-selected
      queueMicrotask(() => {
        setAutoCreateOutletId(singleOutlet.id);
        setShowCreateDialog(true);
      });
    }
  }, [outletsLoading, layoutsLoading, assignedOutlets, existingLayouts]);

  // Editor mode
  if (editorFloorPlanId) {
    return (
      <PageMotion>
        <div className="space-y-2">
          {/* Back button - only show if multiple outlets or single outlet with existing layout */}
          {assignedOutlets.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="cursor-pointer mb-1"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              {t("title")}
            </Button>
          )}

          <FloorLayoutEditor
            floorPlanId={editorFloorPlanId}
            onBack={handleBackToList}
          />
        </div>
      </PageMotion>
    );
  }

  // Null state: RBAC granted but no outlets assigned at all
  if (!outletsLoading && assignedOutlets.length === 0) {
    return (
      <PageMotion>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative">
            <Store className="h-16 w-16 text-muted-foreground/15" />
            <ShieldOff className="h-7 w-7 absolute -bottom-1 -right-1 text-amber-500" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="font-semibold text-base">No Outlets Assigned</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your account has POS access but no outlet has been assigned to you.
              Please contact your administrator.
            </p>
            <Button asChild variant="outline" className="mt-2 cursor-pointer">
              <Link href="/master-data/outlet">{t("addOutlet")}</Link>
            </Button>
          </div>
        </div>
      </PageMotion>
    );
  }

  // Loading state - when auto-navigating for single outlet
  if (
    assignedOutlets.length === 1 && 
    (outletsLoading || layoutsLoading)
  ) {
    return (
      <PageMotion>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading floor layout…</p>
          </div>
        </div>
      </PageMotion>
    );
  }

  // List mode
  return (
    <>
      <PageMotion>
        <FloorLayoutList onOpenEditor={handleOpenEditor} companyId={companyId} />
      </PageMotion>

      {/* Create floor plan dialog for single outlet flow */}
      <CreateFloorPlanDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
        preSelectedOutletId={autoCreateOutletId ?? undefined}
        companyId={companyId}
      />
    </>
  );
}
