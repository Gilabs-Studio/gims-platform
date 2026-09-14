enum MachineStatus { running, idle, downtime, maintenance }

class DowntimeLogEvent {
  final String startTime; // e.g. "08:30"
  final String endTime;   // e.g. "09:15"
  final MachineStatus status;
  final String reason;    // e.g. "Spindle Motor Overheat"
  final int durationMinutes; // 45

  const DowntimeLogEvent({
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.reason,
    required this.durationMinutes,
  });
}

class MachineItem {
  final String id;
  final String name;
  final String lineId;
  final String lineName;
  final MachineStatus status;
  final double oeeScore; // Overall Equipment Effectiveness (%)
  final double temperature; // Celsius
  final double vibrationLevel;
  final String lastMaintenance;
  final List<DowntimeLogEvent> downtimeLogs;

  const MachineItem({
    required this.id,
    required this.name,
    required this.lineId,
    required this.lineName,
    required this.status,
    required this.oeeScore,
    required this.temperature,
    required this.vibrationLevel,
    required this.lastMaintenance,
    this.downtimeLogs = const [],
  });
}

class ProductionLine {
  final String id;
  final String name;
  final int targetOutput;
  final int currentOutput;
  final double defectRate; // Percentage e.g. 1.2%
  final String supervisor;

  const ProductionLine({
    required this.id,
    required this.name,
    required this.targetOutput,
    required this.currentOutput,
    required this.defectRate,
    required this.supervisor,
  });

  double get completionPercentage =>
      targetOutput > 0 ? (currentOutput / targetOutput) * 100 : 0.0;
}

class MachineAlert {
  final String id;
  final String machineName;
  final String lineName;
  final String severity; // "HIGH", "MEDIUM", "LOW"
  final String message;
  final DateTime timestamp;

  const MachineAlert({
    required this.id,
    required this.machineName,
    required this.lineName,
    required this.severity,
    required this.message,
    required this.timestamp,
  });
}
