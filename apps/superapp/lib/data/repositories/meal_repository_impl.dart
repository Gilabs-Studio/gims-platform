import '../../domain/entities/meal_entity.dart';
import '../../domain/repositories/meal_repository.dart';
import '../datasources/mock_meal_datasource.dart';

class MealRepositoryImpl implements MealRepository {
  final MockMealDatasource _datasource;

  MealRepositoryImpl({MockMealDatasource? datasource})
      : _datasource = datasource ?? MockMealDatasource();

  final List<MealOrder> _localOrders = [];
  List<MealMenuItem>? _localMenuItems;

  @override
  Future<List<MealMenuItem>> getDailyMenuItems() async {
    if (_localMenuItems == null) {
      final initialItems = await _datasource.getDailyMenuItems();
      _localMenuItems = List.from(initialItems);
    }
    return _localMenuItems!;
  }

  @override
  Future<List<MealOrder>> getActiveOrders() async {
    if (_localOrders.isEmpty) {
      final mockOrders = await _datasource.getActiveOrders();
      _localOrders.addAll(mockOrders);
    }
    return List.unmodifiable(_localOrders);
  }

  @override
  Future<MealOrder> placeOrder(
    MealMenuItem menuItem,
    int quantity,
    String notes, {
    String customerName = "Staff Operasional",
    String department = "Manufaktur",
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final newOrder = MealOrder(
      id: "ORD-OB-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
      orderTime: DateTime.now(),
      menuItem: menuItem,
      quantity: quantity,
      notes: notes,
      status: "Diproses OB",
      customerName: customerName,
      department: department,
      isCheckedInShoppingList: false,
    );
    _localOrders.insert(0, newOrder);
    return newOrder;
  }

  @override
  Future<MealOrder> placeBulkOrder({
    required String groupName,
    required String customerName,
    required String department,
    required List<BulkMealOrderItem> items,
    required String notes,
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final itemsList = await getDailyMenuItems();
    final firstItem = itemsList.firstWhere(
      (m) => m.id == (items.isNotEmpty ? items.first.menuItemId : "MENU-01"),
      orElse: () => itemsList.first,
    );

    final totalQuantity = items.fold(0, (sum, i) => sum + i.quantity);

    final newOrder = MealOrder(
      id: "ORD-OB-BULK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
      orderTime: DateTime.now(),
      menuItem: firstItem,
      quantity: totalQuantity,
      notes: notes,
      status: "Diproses OB",
      customerName: customerName,
      department: department,
      isBulkOrder: true,
      groupName: groupName,
      bulkItems: items,
      isCheckedInShoppingList: false,
    );

    _localOrders.insert(0, newOrder);
    return newOrder;
  }

  @override
  Future<void> updateOrderStatus(String orderId, String newStatus) async {
    final index = _localOrders.indexWhere((o) => o.id == orderId);
    if (index != -1) {
      _localOrders[index] = _localOrders[index].copyWith(status: newStatus);
    }
  }

  @override
  Future<void> toggleShoppingCheck(String orderId) async {
    final index = _localOrders.indexWhere((o) => o.id == orderId);
    if (index != -1) {
      final current = _localOrders[index].isCheckedInShoppingList;
      _localOrders[index] = _localOrders[index].copyWith(isCheckedInShoppingList: !current);
    }
  }

  @override
  Future<void> saveMenuItem(MealMenuItem item) async {
    final items = await getDailyMenuItems();
    final index = items.indexWhere((m) => m.id == item.id);
    if (index != -1) {
      _localMenuItems![index] = item;
    } else {
      _localMenuItems!.insert(0, item);
    }
  }

  @override
  Future<void> toggleMenuItemAvailability(String menuItemId) async {
    final items = await getDailyMenuItems();
    final index = items.indexWhere((m) => m.id == menuItemId);
    if (index != -1) {
      final current = _localMenuItems![index].isAvailableToday;
      _localMenuItems![index] = _localMenuItems![index].copyWith(isAvailableToday: !current);
    }
  }
}

