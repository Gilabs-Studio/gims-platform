class MealMenuItem {
  final String id;
  final String name;
  final String category; // "Makanan Utama", "Minuman", "Extra / Snack"
  final String description;
  final String imageUrl;
  final bool isAvailableToday;
  final String vendorName;

  const MealMenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.imageUrl,
    required this.isAvailableToday,
    this.vendorName = "Dapur OB Internal",
  });
}

class MealOrder {
  final String id;
  final DateTime orderTime;
  final MealMenuItem menuItem;
  final int quantity;
  final String notes;
  final String status; // "Diproses OB", "Sedang Dimasak", "Siap Diambil", "Selesai"

  const MealOrder({
    required this.id,
    required this.orderTime,
    required this.menuItem,
    required this.quantity,
    required this.notes,
    required this.status,
  });
}
