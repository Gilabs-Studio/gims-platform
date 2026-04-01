"use client";

import { ListFilter, PanelsTopLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TravelPlannerMobileToolbarProps {
  showPlans: () => void;
  showDetails: () => void;
  closePanels: () => void;
  hasOpenPanel: boolean;
}

export function TravelPlannerMobileToolbar({
  showPlans,
  showDetails,
  closePanels,
  hasOpenPanel,
}: TravelPlannerMobileToolbarProps) {
  return (
    <div className="absolute left-3 right-3 top-3 z-50 flex items-center gap-2 rounded-xl border bg-background/90 p-2 shadow-lg backdrop-blur">
      <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={showPlans}>
        <PanelsTopLeft className="h-4 w-4 mr-2" />
        Plans
      </Button>
      <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={showDetails}>
        <ListFilter className="h-4 w-4 mr-2" />
        Details
      </Button>
      {hasOpenPanel ? (
        <Button type="button" variant="secondary" className="cursor-pointer" onClick={closePanels}>
          Map
        </Button>
      ) : null}
    </div>
  );
}
