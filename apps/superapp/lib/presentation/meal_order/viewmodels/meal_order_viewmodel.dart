import 'package:flutter/material.dart';
import '../../../domain/entities/meal_entity.dart';
import '../../../domain/repositories/meal_repository.dart';

class AggregatedShoppingItem {
  final String menuItemName;
  final String category;
  final int totalQuantity;
  final List<String> notes;
  final List<String> orderIds;
  final bool isAllChecked;

  const AggregatedShoppingItem({
    required this.menuItemName,
    required this.category,
    required this.totalQuantity,
    required this.notes,
    required this.orderIds,
    required this.isAllChecked,
  });
}

class MealOrderViewModel extends ChangeNotifier {
  final MealRepository _repository;

  MealOrderViewModel(this._repository);

  List<MealMenuItem> _menuItems = [];
  List<MealOrder> _orders = [];
  String _selectedCategory = "Semua";
  bool _isLoading = false;
  bool _isObActive = true;

  List<MealMenuItem> get rawMenuItems => _menuItems;

  List<MealMenuItem> get menuItems {
    if (_selectedCategory == "Semua") return _menuItems;
    return _menuItems.where((m) => m.category == _selectedCategory).toList();
  }

  List<MealOrder> get orders => _orders;
  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;
  bool get isObActive => _isObActive;

  int get pendingOrdersCount => _orders.where((o) => o.status != "Selesai").length;
  List<MealOrder> get bulkOrders => _orders.where((o) => o.isBulkOrder).toList();

  List<AggregatedShoppingItem> get aggregatedShoppingList {
    final Map<String, List<MealOrder>> grouped = {};

    for (final order in _orders.where((o) => o.status != "Selesai")) {
      if (order.isBulkOrder && order.bulkItems.isNotEmpty) {
        for (final item in order.bulkItems) {
          final key = item.menuItemName;
          if (!grouped.containsKey(key)) grouped[key] = [];
          // synthesize order wrapper
          grouped[key]!.add(order);
        }
      } else {
        final key = order.menuItem.name;
        if (!grouped.containsKey(key)) grouped[key] = [];
        grouped[key]!.add(order);
      }
    }

    final List<AggregatedShoppingItem> result = [];

    grouped.forEach((menuName, orderList) {
      int qtySum = 0;
      final List<String> notesList = [];
      final List<String> idsList = [];
      bool allChecked = true;

      for (final ord in orderList) {
        idsList.add(ord.id);
        if (!ord.isCheckedInShoppingList) allChecked = false;
        if (ord.isBulkOrder && ord.bulkItems.isNotEmpty) {
          for (final bItem in ord.bulkItems) {
            if (bItem.menuItemName == menuName) {
              qtySum += bItem.quantity;
              if (bItem.notes.isNotEmpty) notesList.add("${ord.customerName}: ${bItem.notes}");
            }
          }
        } else {
          qtySum += ord.quantity;
          if (ord.notes.isNotEmpty) notesList.add("${ord.customerName}: ${ord.notes}");
        }
      }

      final category = _menuItems
          .firstWhere((m) => m.name == menuName, orElse: () => _menuItems.first)
          .category;

      result.add(AggregatedShoppingItem(
        menuItemName: menuName,
        category: category,
        totalQuantity: qtySum,
        notes: notesList,
        orderIds: idsList,
        isAllChecked: allChecked,
      ));
    });

    return result;
  }

  void toggleObActive() {
    _isObActive = !_isObActive;
    notifyListeners();
  }

  Future<void> loadMealData() async {
    _isLoading = true;
    notifyListeners();

    try {
      _menuItems = await _repository.getDailyMenuItems();
      _orders = await _repository.getActiveOrders();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectCategory(String cat) {
    _selectedCategory = cat;
    notifyListeners();
  }

  Future<void> placeOrder(
    MealMenuItem item,
    int qty,
    String notes, {
    String customerName = "Staff Operasional",
    String department = "Manufaktur",
  }) async {
    await _repository.placeOrder(
      item,
      qty,
      notes,
      customerName: customerName,
      department: department,
    );
    await loadMealData();
  }

  Future<void> placeBulkOrder({
    required String groupName,
    required String customerName,
    required String department,
    required List<BulkMealOrderItem> items,
    required String notes,
  }) async {
    await _repository.placeBulkOrder(
      groupName: groupName,
      customerName: customerName,
      department: department,
      items: items,
      notes: notes,
    );
    await loadMealData();
  }

  Future<void> updateOrderStatus(String orderId, String newStatus) async {
    await _repository.updateOrderStatus(orderId, newStatus);
    _orders = await _repository.getActiveOrders();
    notifyListeners();
  }

  Future<void> toggleShoppingCheck(String orderId) async {
    await _repository.toggleShoppingCheck(orderId);
    _orders = await _repository.getActiveOrders();
    notifyListeners();
  }

  Future<void> toggleGroupShoppingCheck(List<String> orderIds) async {
    for (final id in orderIds) {
      await _repository.toggleShoppingCheck(id);
    }
    _orders = await _repository.getActiveOrders();
    notifyListeners();
  }

  Future<void> saveMenuItem(MealMenuItem item) async {
    await _repository.saveMenuItem(item);
    _menuItems = await _repository.getDailyMenuItems();
    notifyListeners();
  }

  Future<void> toggleMenuItemAvailability(String menuItemId) async {
    await _repository.toggleMenuItemAvailability(menuItemId);
    _menuItems = await _repository.getDailyMenuItems();
    notifyListeners();
  }
}

