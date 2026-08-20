import '../../domain/entities/manufacturing_entity.dart';

class MockManufacturingDatasource {
  Future<List<ProductionLine>> getProductionLines() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return const [
      ProductionLine(
        id: "LINE-1",
        name: "Line 1 - Stamping & Metal Sheet",
        targetOutput: 2500,
        currentOutput: 2310,
        defectRate: 0.8,
        supervisor: "Budi Santoso",
      ),
      ProductionLine(
        id: "LINE-2",
        name: "Line 2 - High Precision CNC Machining",
        targetOutput: 1800,
        currentOutput: 1420,
        defectRate: 2.4, // Alert line
        supervisor: "Ahmad Dahlan",
      ),
      ProductionLine(
        id: "LINE-3",
        name: "Line 3 - Plastic Injection Molding",
        targetOutput: 3200,
        currentOutput: 3150,
        defectRate: 0.4,
        supervisor: "Rian Hidayat",
      ),
      ProductionLine(
        id: "LINE-4",
        name: "Line 4 - Robotic Welding & Assembly",
        targetOutput: 1200,
        currentOutput: 1180,
        defectRate: 1.1,
        supervisor: "Dewi Sartika",
      ),
    ];
  }

  Future<List<MachineItem>> getMachines() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return const [
      MachineItem(
        id: "MCH-101",
        name: "Hydraulic Press 500T",
        lineId: "LINE-1",
        lineName: "Line 1 Stamping",
        status: MachineStatus.running,
        oeeScore: 92.4,
        temperature: 68.5,
        vibrationLevel: 1.2,
        lastMaintenance: "12 Ags 2026",
      ),
      MachineItem(
        id: "MCH-102",
        name: "Laser Cutting Amada 4kW",
        lineId: "LINE-1",
        lineName: "Line 1 Stamping",
        status: MachineStatus.running,
        oeeScore: 89.1,
        temperature: 72.0,
        vibrationLevel: 1.8,
        lastMaintenance: "05 Ags 2026",
      ),
      MachineItem(
        id: "MCH-201",
        name: "5-Axis CNC Milling Mazak VCN",
        lineId: "LINE-2",
        lineName: "Line 2 CNC Machining",
        status: MachineStatus.downtime,
        oeeScore: 54.2,
        temperature: 94.8, // High temperature alert!
        vibrationLevel: 4.5,
        lastMaintenance: "20 Jul 2026",
      ),
      MachineItem(
        id: "MCH-202",
        name: "CNC Lathe Doosan Lynx",
        lineId: "LINE-2",
        lineName: "Line 2 CNC Machining",
        status: MachineStatus.idle,
        oeeScore: 71.5,
        temperature: 62.1,
        vibrationLevel: 2.1,
        lastMaintenance: "01 Ags 2026",
      ),
      MachineItem(
        id: "MCH-301",
        name: "KraussMaffei Injection 350T",
        lineId: "LINE-3",
        lineName: "Line 3 Injection",
        status: MachineStatus.running,
        oeeScore: 96.8,
        temperature: 78.4,
        vibrationLevel: 1.0,
        lastMaintenance: "18 Ags 2026",
      ),
      MachineItem(
        id: "MCH-401",
        name: "KUKA Welding Robot Cell A",
        lineId: "LINE-4",
        lineName: "Line 4 Welding",
        status: MachineStatus.maintenance,
        oeeScore: 68.0,
        temperature: 55.0,
        vibrationLevel: 0.5,
        lastMaintenance: "Hari ini (Sedang Servis)",
      ),
    ];
  }

  Future<List<MachineAlert>> getActiveAlerts() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return [
      MachineAlert(
        id: "ALT-901",
        machineName: "5-Axis CNC Milling Mazak VCN",
        lineName: "Line 2 CNC Machining",
        severity: "HIGH",
        message: "Spindle Overheating (94.8°C). Mesin otomatis terhenti oleh Interlock PLC.",
        timestamp: DateTime.now().subtract(const Duration(minutes: 18)),
      ),
      MachineAlert(
        id: "ALT-902",
        machineName: "CNC Lathe Doosan Lynx",
        lineName: "Line 2 CNC Machining",
        severity: "MEDIUM",
        message: "Material Feed Idle > 20 Menit. Menunggu suplai raw material aluminium.",
        timestamp: DateTime.now().subtract(const Duration(minutes: 42)),
      ),
    ];
  }
}
