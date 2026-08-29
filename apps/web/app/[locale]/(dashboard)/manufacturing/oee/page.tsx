import React from "react";
import { OeeDashboard } from "@/features/manufacturing/oee/components/oee-dashboard";

export const metadata = {
  title: "OEE & Shop Floor Control | GIMS Manufacturing",
  description: "Real-time production execution monitoring, machine efficiency analytics, and downtime tracking.",
};

export default function ManufacturingOeePage() {
  return <OeeDashboard />;
}
