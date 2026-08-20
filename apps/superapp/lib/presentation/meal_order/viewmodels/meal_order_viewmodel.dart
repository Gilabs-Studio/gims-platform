import 'package:flutter/material.dart';
import '../../../domain/entities/meal_entity.dart';
import '../../../domain/repositories/meal_repository.dart';

class MealOrderViewModel extends ChangeNotifier {
  final MealRepository _repository;

  MealOrderViewModel(this._repository);

  List<MealMenuItem> _menuItems = [];
  List<MealOrder> _orders = [];
  String _selectedCategory = "Semua";
  bool _isLoading = false;

  List<MealMenuItem> get menuItems {
    if (_selectedCategory == "Semua") return _menuItems;
    return _menuItems.where((m) => m.category == _selectedCategory).toList();
  }

  List<MealOrder> get orders => _orders;
  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;

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

  Future<void> placeOrder(MealMenuItem item, int qty, String notes) async {
    await _repository.placeOrder(item, qty, notes);
    await loadMealData();
  }
}
