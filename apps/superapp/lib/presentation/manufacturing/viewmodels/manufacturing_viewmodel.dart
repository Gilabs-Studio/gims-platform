import 'package:flutter/material.dart';
import '../../../domain/entities/manufacturing_entity.dart';
import '../../../domain/repositories/manufacturing_repository.dart';

class ManufacturingViewModel extends ChangeNotifier {
  final ManufacturingRepository _repository;

  ManufacturingViewModel(this._repository);

  List<ProductionLine> _lines = [];
  List<MachineItem> _machines = [];
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
