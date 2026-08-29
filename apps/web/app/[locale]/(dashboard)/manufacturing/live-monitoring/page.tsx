import React from "react";
import { LiveMonitoringWall } from "@/features/manufacturing/live-monitoring/components/live-monitoring-wall";

export const metadata = {
  title: "Live Wall Monitoring | GIMS Manufacturing",
  description: "Real-time TV Wall Kanban display for shop floor machine status, alarm ticker, and plant performance.",
};

export default function ManufacturingLiveMonitoringPage() {
  return <LiveMonitoringWall />;
}
