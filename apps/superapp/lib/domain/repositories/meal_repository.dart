import '../entities/meal_entity.dart';

abstract class MealRepository {
  Future<List<MealMenuItem>> getDailyMenuItems();
  Future<List<MealOrder>> getActiveOrders();
  Future<MealOrder> placeOrder(
    MealMenuItem menuItem,
    int quantity,
    String notes, {
    String customerName = "Staff Operasional",
    String department = "Manufaktur",
  });
  Future<MealOrder> placeBulkOrder({
    required String groupName,
    required String customerName,
    required String department,
    required List<BulkMealOrderItem> items,
    required String notes,
  });
  Future<void> updateOrderStatus(String orderId, String newStatus);
  Future<void> toggleShoppingCheck(String orderId);
  Future<void> saveMenuItem(MealMenuItem item);
  Future<void> toggleMenuItemAvailability(String menuItemId);
}

