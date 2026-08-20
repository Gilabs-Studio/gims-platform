import '../../domain/entities/meal_entity.dart';
import '../../domain/repositories/meal_repository.dart';
import '../datasources/mock_meal_datasource.dart';

class MealRepositoryImpl implements MealRepository {
  final MockMealDatasource _datasource;

  MealRepositoryImpl({MockMealDatasource? datasource})
      : _datasource = datasource ?? MockMealDatasource();

  final List<MealOrder> _localOrders = [];

  @override
  Future<List<MealMenuItem>> getDailyMenuItems() => _datasource.getDailyMenuItems();

  @override
  Future<List<MealOrder>> getActiveOrders() async {
    final mockOrders = await _datasource.getActiveOrders();
    return [..._localOrders, ...mockOrders];
  }

  @override
  Future<MealOrder> placeOrder(MealMenuItem menuItem, int quantity, String notes) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final newOrder = MealOrder(
      id: "ORD-OB-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
      orderTime: DateTime.now(),
      menuItem: menuItem,
      quantity: quantity,
      notes: notes,
      status: "Diproses OB",
    );
    _localOrders.insert(0, newOrder);
    return newOrder;
  }
}
