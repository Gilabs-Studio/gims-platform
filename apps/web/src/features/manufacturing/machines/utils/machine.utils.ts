import type {
  MachineStatus,
  SensorHealthStatus,
  IncidentSeverity,
  ResolutionStatus,
} from "../types/machine.types";

export function getMachineStatusVariant(
  status: MachineStatus
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "soft" {
  switch (status) {
    case "running":
      return "success";
    case "downtime":
      return "destructive";
    case "maintenance":
      return "soft";
    case "idle":
    default:
      return "warning";
  }
}

export function getMachineStatusBorder(status: MachineStatus): string {
  switch (status) {
    case "running":
      return "border-success/30 hover:border-success";
    case "downtime":
      return "border-destructive/60 bg-destructive/5 hover:border-destructive";
    case "maintenance":
      return "border-purple/30 hover:border-purple";
    case "idle":
    default:
      return "border-warning/30 hover:border-warning";
  }
}

export function getMachineStatusBg(status: MachineStatus): string {
  switch (status) {
    case "running":
      return "bg-success";
    case "downtime":
      return "bg-destructive";
    case "maintenance":
      return "bg-purple";
    case "idle":
    default:
      return "bg-warning";
  }
}

export function getSensorStatus(
  value: number,
  type: "temperature" | "vibration"
): SensorHealthStatus {
  if (type === "temperature") {
    if (value >= 85) return "critical";
    if (value >= 75) return "warning";
    return "normal";
  } else {
    if (value >= 4.0) return "critical";
    if (value >= 2.5) return "warning";
    return "normal";
  }
}

export function getSensorStatusColor(status: SensorHealthStatus): string {
  switch (status) {
    case "critical":
      return "text-destructive";
    case "warning":
      return "text-warning";
    case "normal":
    default:
      return "text-success";
  }
}

export function getSeverityBadgeVariant(
  severity: IncidentSeverity
): "destructive" | "warning" | "secondary" | "outline" {
  switch (severity) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    case "low":
    default:
      return "secondary";
  }
}

export function getResolutionBadgeVariant(
  status: ResolutionStatus
): "success" | "warning" | "destructive" {
  switch (status) {
    case "resolved":
      return "success";
    case "in_progress":
      return "warning";
    case "open":
    default:
      return "destructive";
  }
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function formatMtbf(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

export function formatMttr(minutes: number): string {
  return `${minutes} mins`;
}

export function getHealthColorClass(healthIndex: number): string {
  if (healthIndex >= 85) return "text-success";
  if (healthIndex >= 65) return "text-warning";
  return "text-destructive";
}
