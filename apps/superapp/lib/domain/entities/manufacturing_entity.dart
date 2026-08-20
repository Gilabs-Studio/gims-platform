enum MachineStatus { running, idle, downtime, maintenance }

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
