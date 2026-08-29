import React from "react";
import { DowntimeParetoView } from "@/features/manufacturing/downtime/components/downtime-pareto-view";

export const metadata = {
  title: "Downtime Pareto Analysis | GIMS Manufacturing",
  description: "Pareto analysis of lost production hours, failure category breakdowns, and incident logs.",
};

export default function ManufacturingDowntimePage() {
  return <DowntimeParetoView />;
}
