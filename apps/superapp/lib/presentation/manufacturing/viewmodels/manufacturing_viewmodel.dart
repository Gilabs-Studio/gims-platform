import 'package:flutter/material.dart';
import '../../../domain/entities/manufacturing_entity.dart';
import '../../../domain/repositories/manufacturing_repository.dart';

class ManufacturingViewModel extends ChangeNotifier {
  final ManufacturingRepository _repository;

  ManufacturingViewModel(this._repository) {
    loadManufacturingData();
  }

  List<ProductionLine> _lines = [];
  List<MachineItem> _machines = const [
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
      downtimeLogs: [
        DowntimeLogEvent(startTime: "06:00", endTime: "08:00", status: MachineStatus.running, reason: "Operasi Normal", durationMinutes: 120),
        DowntimeLogEvent(startTime: "08:00", endTime: "08:15", status: MachineStatus.idle, reason: "Ganti Matras Stamping", durationMinutes: 15),
        DowntimeLogEvent(startTime: "08:15", endTime: "16:00", status: MachineStatus.running, reason: "Produksi Berkelanjutan", durationMinutes: 465),
      ],
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
      downtimeLogs: [
        DowntimeLogEvent(startTime: "06:00", endTime: "09:30", status: MachineStatus.running, reason: "Pemotongan Plat Metal", durationMinutes: 210),
        DowntimeLogEvent(startTime: "09:30", endTime: "09:45", status: MachineStatus.idle, reason: "Pembersihan Nozzle Laser", durationMinutes: 15),
        DowntimeLogEvent(startTime: "09:45", endTime: "16:00", status: MachineStatus.running, reason: "Pemotongan Batch B", durationMinutes: 375),
      ],
    ),
    MachineItem(
      id: "MCH-201",
      name: "5-Axis CNC Milling Mazak VCN",
      lineId: "LINE-2",
      lineName: "Line 2 CNC Machining",
      status: MachineStatus.downtime,
      oeeScore: 54.2,
      temperature: 94.8,
      vibrationLevel: 4.5,
      lastMaintenance: "20 Jul 2026",
      downtimeLogs: [
        DowntimeLogEvent(startTime: "06:00", endTime: "08:30", status: MachineStatus.running, reason: "Machining Blok Mesin", durationMinutes: 150),
        DowntimeLogEvent(startTime: "08:30", endTime: "09:45", status: MachineStatus.downtime, reason: "Sensor Thermal Spindle Overheat (94.8°C)", durationMinutes: 75),
        DowntimeLogEvent(startTime: "09:45", endTime: "11:00", status: MachineStatus.maintenance, reason: "Pengurasan & Isi Coolant", durationMinutes: 75),
        DowntimeLogEvent(startTime: "11:00", endTime: "16:00", status: MachineStatus.downtime, reason: "Lockout Interlock - Menunggu Sparepart", durationMinutes: 300),
      ],
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
      downtimeLogs: [
        DowntimeLogEvent(startTime: "06:00", endTime: "09:10", status: MachineStatus.running, reason: "Pembubutan Poros Axle", durationMinutes: 190),
        DowntimeLogEvent(startTime: "09:10", endTime: "10:30", status: MachineStatus.idle, reason: "Menunggu Suplai Raw Material Aluminium", durationMinutes: 80),
        DowntimeLogEvent(startTime: "10:30", endTime: "16:00", status: MachineStatus.running, reason: "Melanjutkan Pembubutan", durationMinutes: 330),
      ],
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
      downtimeLogs: [
        DowntimeLogEvent(startTime: "06:00", endTime: "16:00", status: MachineStatus.running, reason: "Injeksi Presisi Bumper Auto", durationMinutes: 600),
      ],
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
      downtimeLogs: [
        DowntimeLogEvent(startTime: "06:00", endTime: "07:30", status: MachineStatus.running, reason: "Pengelasan Frame A", durationMinutes: 90),
        DowntimeLogEvent(startTime: "07:30", endTime: "16:00", status: MachineStatus.maintenance, reason: "Kalibrasi Servo & Penggantian Torch Tip", durationMinutes: 510),
      ],
    ),
  ];
  List<MachineAlert> _alerts = [];
  bool _isLoading = false;
  String _selectedFilterLine = "Semua";

  List<ProductionLine> get lines => _lines;
  List<MachineItem> get machines {
    if (_selectedFilterLine == "Semua") return _machines;
    return _machines.where((m) => m.lineId == _selectedFilterLine).toList();
  }

  List<MachineAlert> get alerts => _alerts;
  bool get isLoading => _isLoading;
  String get selectedFilterLine => _selectedFilterLine;

  int get totalMachines => _machines.length;
  int get runningCount => _machines.where((m) => m.status == MachineStatus.running).length;
  int get idleCount => _machines.where((m) => m.status == MachineStatus.idle).length;
  int get downtimeCount => _machines.where((m) => m.status == MachineStatus.downtime).length;
  int get maintenanceCount => _machines.where((m) => m.status == MachineStatus.maintenance).length;

  double get averageOee {
    if (_machines.isEmpty) return 0.0;
    final sum = _machines.fold(0.0, (prev, element) => prev + element.oeeScore);
    return sum / _machines.length;
  }

  Future<void> loadManufacturingData() async {
    _isLoading = true;
    notifyListeners();

    try {
      _lines = await _repository.getProductionLines();
      _machines = await _repository.getMachines();
      _alerts = await _repository.getActiveAlerts();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void filterByLine(String lineId) {
    _selectedFilterLine = lineId;
    notifyListeners();
  }
}
