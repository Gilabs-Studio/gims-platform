import React from "react";
import { MachineTelemetryView } from "@/features/manufacturing/machines/components/machine-telemetry-view";

export const metadata = {
  title: "Machine Telemetry | GIMS Manufacturing",
  description: "Real-time monitoring of physical machine sensors, spindle vibration, motor temperature, and 24-hour status timeline.",
};

export default function ManufacturingMachinesPage() {
  return <MachineTelemetryView />;
}
