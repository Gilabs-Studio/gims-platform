import '../entities/manufacturing_entity.dart';

abstract class ManufacturingRepository {
  Future<List<ProductionLine>> getProductionLines();
  Future<List<MachineItem>> getMachines();
  Future<List<MachineAlert>> getActiveAlerts();
}
