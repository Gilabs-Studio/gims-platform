import 'package:flutter_test/flutter_test.dart';
import 'package:superapp/data/datasources/mock_manufacturing_datasource.dart';
import 'package:superapp/data/repositories/manufacturing_repository_impl.dart';
import 'package:superapp/presentation/manufacturing/viewmodels/manufacturing_viewmodel.dart';

void main() {
  group('ManufacturingViewModel Unit Tests', () {
    late ManufacturingViewModel viewModel;

    setUp(() {
      final datasource = MockManufacturingDatasource();
      final repository = ManufacturingRepositoryImpl(datasource: datasource);
      viewModel = ManufacturingViewModel(repository);
    });

    test('loadManufacturingData should populate machines, lines, and alerts', () async {
      await viewModel.loadManufacturingData();

      expect(viewModel.lines.isNotEmpty, true);
      expect(viewModel.machines.isNotEmpty, true);
      expect(viewModel.alerts.isNotEmpty, true);
      expect(viewModel.totalMachines, viewModel.machines.length);
      expect(viewModel.averageOee, greaterThan(0.0));
    });
  });
}
