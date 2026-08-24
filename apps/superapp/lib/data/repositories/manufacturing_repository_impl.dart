import '../../domain/entities/manufacturing_entity.dart';
import '../../domain/repositories/manufacturing_repository.dart';
import '../datasources/mock_manufacturing_datasource.dart';

class ManufacturingRepositoryImpl implements ManufacturingRepository {
  final MockManufacturingDatasource _datasource;

  ManufacturingRepositoryImpl({MockManufacturingDatasource? datasource})
      : _datasource = datasource ?? MockManufacturingDatasource();

  @override
  Future<List<ProductionLine>> getProductionLines() => _datasource.getProductionLines();

  @override
  Future<List<MachineItem>> getMachines() => _datasource.getMachines();

  @override
  Future<List<MachineAlert>> getActiveAlerts() => _datasource.getActiveAlerts();
}
