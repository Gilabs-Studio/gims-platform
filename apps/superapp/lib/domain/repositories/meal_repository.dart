import '../entities/meal_entity.dart';

abstract class MealRepository {
  Future<List<MealMenuItem>> getDailyMenuItems();
  Future<List<MealOrder>> getActiveOrders();
  Future<MealOrder> placeOrder(MealMenuItem menuItem, int quantity, String notes);
}
